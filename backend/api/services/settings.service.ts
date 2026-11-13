import {settingsRepository} from '../repositories/settings.repository';
import {DASHBOARD_TARGETS, type SiteSettingDocument} from '../models/SiteSetting.model';
import type {DashboardThemeDto} from '../dtos/settings.dto';
import {
  DEFAULT_FREE_DELIVERY_SETTINGS,
  isValidLatLng,
  type FreeDeliverySettings
} from '../config/delivery';
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
      dashboardTheme: _ignoredTheme,
      ...rest
    } = data as Partial<SiteSettingDocument> & {
      freeDelivery?: unknown;
      rewardsEarnPoints?: unknown;
      rewardsEarnPesos?: unknown;
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
