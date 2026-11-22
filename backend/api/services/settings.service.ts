import {settingsRepository} from '../repositories/settings.repository';
import {DASHBOARD_TARGETS, type SiteSettingDocument} from '../models/SiteSetting.model';
import type {DashboardThemeDto} from '../dtos/settings.dto';
import {OrderModel} from '../models/Order.model';
import {PaymentModel} from '../models/Payment.model';
import {
  DEFAULT_FREE_DELIVERY_SETTINGS,
  isValidLatLng,
  type FreeDeliverySettings
} from '../config/delivery';
import {
  DEFAULT_DOWN_PAYMENT_PERCENT,
  DOWN_PAYMENT_PERCENT_MAX,
  DOWN_PAYMENT_PERCENT_MIN,
  resolveDownPaymentPercent
} from '../config/paymentFees';
import {
  DEFAULT_DOWN_PAYMENT_RULES,
  DOWN_PAYMENT_FLOWS,
  DOWN_PAYMENT_MIN_ORDER_MAX,
  resolveDownPaymentRules,
  type DownPaymentFlow,
  type DownPaymentRules
} from '../config/downPaymentRules';
import {
  DEFAULT_REWARDS_EARN_RULE,
  REWARDS_EARN_PESOS_MAX,
  REWARDS_EARN_PESOS_MIN,
  REWARDS_EARN_POINTS_MAX,
  REWARDS_EARN_POINTS_MIN,
  type RewardsEarnRule
} from '../config/rewards';

function inRangeInt(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/** Saved loyalty earn rule, with defaults filled in for unset/invalid parts. */
function resolveRewardsEarn(
  saved: Pick<SiteSettingDocument, 'rewardsEarnPoints' | 'rewardsEarnPesos'> | null | undefined
): RewardsEarnRule {
  const points = saved?.rewardsEarnPoints;
  const pesos = saved?.rewardsEarnPesos;
  return {
    rewardsEarnPoints: inRangeInt(points, REWARDS_EARN_POINTS_MIN, REWARDS_EARN_POINTS_MAX)
      ? points
      : DEFAULT_REWARDS_EARN_RULE.rewardsEarnPoints,
    rewardsEarnPesos: inRangeInt(pesos, REWARDS_EARN_PESOS_MIN, REWARDS_EARN_PESOS_MAX)
      ? pesos
      : DEFAULT_REWARDS_EARN_RULE.rewardsEarnPesos
  };
}

/** Saved free-delivery settings, with defaults filled in for unset parts. */
function resolveFreeDelivery(
  saved: SiteSettingDocument['freeDelivery'] | undefined
): FreeDeliverySettings {
  const zone = (saved?.zone ?? [])
    .map(p => ({lat: Number(p.lat), lng: Number(p.lng)}))
    .filter(isValidLatLng);
  return {
    enabled:
      typeof saved?.enabled === 'boolean'
        ? saved.enabled
        : DEFAULT_FREE_DELIVERY_SETTINGS.enabled,
    minSubtotal:
      typeof saved?.minSubtotal === 'number' && saved.minSubtotal >= 0
        ? saved.minSubtotal
        : DEFAULT_FREE_DELIVERY_SETTINGS.minSubtotal,
    zone: zone.length >= 3 ? zone : DEFAULT_FREE_DELIVERY_SETTINGS.zone
  };
}

export const settingsService = {
  async get() {
    return settingsRepository.findOrCreate();
  },

  async update(data: Partial<SiteSettingDocument>) {
    // Free delivery and the rewards earn rule have their own validated
    // endpoints; never let the generic homepage save overwrite them.
    const {
      freeDelivery: _ignored,
      rewardsEarnPoints: _ignoredPoints,
      rewardsEarnPesos: _ignoredPesos,
      downPaymentPercent: _ignoredDownPayment,
      downPaymentRules: _ignoredDownPaymentRules,
      dashboardTheme: _ignoredTheme,
      ...rest
    } = data as Partial<SiteSettingDocument> & {
      freeDelivery?: unknown;
      rewardsEarnPoints?: unknown;
      rewardsEarnPesos?: unknown;
      downPaymentPercent?: unknown;
      downPaymentRules?: unknown;
      dashboardTheme?: unknown;
    };
    return settingsRepository.update(rest);
  },

  async getFreeDelivery(): Promise<FreeDeliverySettings> {
    const doc = await settingsRepository.findOrCreate();
    return resolveFreeDelivery(doc.freeDelivery);
  },

  async updateFreeDelivery(input: FreeDeliverySettings): Promise<FreeDeliverySettings> {
    const doc = await settingsRepository.update({
      freeDelivery: {
        enabled: input.enabled,
        minSubtotal: input.minSubtotal,
        zone: input.zone.map(p => ({lat: p.lat, lng: p.lng}))
      }
    } as Partial<SiteSettingDocument>);
    return resolveFreeDelivery(doc?.freeDelivery);
  },

  defaultFreeDelivery(): FreeDeliverySettings {
    return DEFAULT_FREE_DELIVERY_SETTINGS;
  },

  /** The live loyalty earn rule (points per pesos), defaults if never saved. */
  async getRewardsEarn(): Promise<RewardsEarnRule> {
    const doc = await settingsRepository.findOrCreate();
    return resolveRewardsEarn(doc);
  },

  async updateRewardsEarn(input: RewardsEarnRule): Promise<RewardsEarnRule> {
    const doc = await settingsRepository.update({
      rewardsEarnPoints: input.rewardsEarnPoints,
      rewardsEarnPesos: input.rewardsEarnPesos
    } as Partial<SiteSettingDocument>);
    return resolveRewardsEarn(doc);
  },

  defaultRewardsEarn(): RewardsEarnRule {
    return DEFAULT_REWARDS_EARN_RULE;
  },

  /** Live down payment rule of every order flow, defaults if never saved. */
  async getDownPaymentRules(): Promise<DownPaymentRules> {
    const doc = await settingsRepository.findOrCreate();
    return resolveDownPaymentRules(doc);
  },

  /** Live down payment percent of one flow (pre-orders when not given). */
  async getDownPaymentPercent(flow: DownPaymentFlow = 'preorder'): Promise<number> {
    return (await this.getDownPaymentRules())[flow].percent;
  },

  /**
   * Saves the rules and stamps each flow's percent on every open order of that
   * flow that has not paid anything yet (reads of unpaid orders use the live
   * setting anyway, see downPaymentPercentFor; this keeps the stored value in
   * step). Orders that already paid a down payment (or in full) keep their
   * percent. Orders with an open online invoice are skipped too: that invoice
   * was issued for the old amount, so changing the percent under it would
   * make the paid amount and the order disagree.
   */
  async updateDownPaymentRules(
    input: DownPaymentRules
  ): Promise<{rules: DownPaymentRules; ordersUpdated: number}> {
    const doc = await settingsRepository.update({
      downPaymentRules: input,
      // Kept in step for anything still reading the old single setting.
      downPaymentPercent: input.preorder.percent
    } as Partial<SiteSettingDocument>);
    const rules = resolveDownPaymentRules(doc ?? {});

    const withOpenInvoice = await PaymentModel.distinct('orderId', {status: 'PENDING'});
    let ordersUpdated = 0;
    for (const flow of DOWN_PAYMENT_FLOWS) {
      const percent = rules[flow].percent;
      const flowFilter =
        flow === 'preorder' ? {isPreOrder: true} : {isPreOrder: {$ne: true}, orderType: flow};
      const result = await OrderModel.updateMany(
        {
          ...flowFilter,
          orderSource: {$ne: 'in-store'},
          paymentStatus: {$in: ['unpaid', null]},
          orderStatus: {$nin: ['cancelled', 'completed']},
          _id: {$nin: withOpenInvoice},
          downPaymentPercent: {$ne: percent}
        },
        {$set: {downPaymentPercent: percent}}
      ).exec();
      ordersUpdated += result.modifiedCount;
    }

    return {rules, ordersUpdated};
  },

  /**
   * The down payment percent an order uses: the live setting of its flow
   * while nothing is paid, else the percent the payment was made with.
   */
  async downPaymentPercentFor(
    order: {downPaymentPercent?: number | null; paymentStatus?: string | null},
    flow: DownPaymentFlow
  ): Promise<number> {
    // Nothing paid yet: always the owner's current setting, so a change in
    // Settings reaches every unpaid order (even ones saved with an old value).
    if ((order.paymentStatus ?? 'unpaid') === 'unpaid' || order.downPaymentPercent == null) {
      return this.getDownPaymentPercent(flow);
    }
    // Down payment or full payment made: the percent it was made with.
    return resolveDownPaymentPercent(order.downPaymentPercent);
  },

  downPaymentLimits() {
    return {
      default: DEFAULT_DOWN_PAYMENT_PERCENT,
      min: DOWN_PAYMENT_PERCENT_MIN,
      max: DOWN_PAYMENT_PERCENT_MAX,
      minOrderMax: DOWN_PAYMENT_MIN_ORDER_MAX
    };
  },

  defaultDownPaymentRules(): DownPaymentRules {
    return DEFAULT_DOWN_PAYMENT_RULES;
  },

  /** Saves one dashboard's colors; '' resets a color to the default. */
  async updateDashboardTheme(input: DashboardThemeDto) {
    const doc = await settingsRepository.update({
      // Dot path: only this dashboard changes, the others are kept.
      [`dashboardTheme.${input.target}`]: {
        sidebarBg: input.sidebarBg.trim().toLowerCase(),
        accent: input.accent.trim().toLowerCase()
      }
    } as Partial<SiteSettingDocument>);
    const saved = doc?.dashboardTheme ?? {};
    return Object.fromEntries(
      DASHBOARD_TARGETS.map(t => [
        t,
        {sidebarBg: saved[t]?.sidebarBg || '', accent: saved[t]?.accent || ''}
      ])
    );
  }
};
