import {
  addDays,
  checkRequestedSlot,
  firstAvailableSlot,
  formatStoreDateTime,
  isClosedDay,
  paymentDueAtFor,
  scheduleRequirement,
  slotsForDay,
  storeDayKey,
  type OrderingRules,
  type ScheduleRequirement,
  type StoreHours
} from '../config/orderSchedule';
import {isPreOrderCategory} from '../config/preOrder';
import {CategoryModel, slugifyCategoryName} from '../models/Category.model';
import type {OrderDocument} from '../models/Order.model';
import {productRepository} from '../repositories/product.repository';
import {ApiError} from '../utils/error';
import {applyServerPrices} from './orderPricing.service';
import {loadActiveBundles} from './bundle.service';
import {settingsService} from './settings.service';
import {storeStatusService} from './storeStatus.service';

export type ScheduleCartItem = {productId: string; quantity: number};

export type ScheduleOrderType = 'pickup' | 'delivery' | 'reservation';

async function storeHours(): Promise<StoreHours & {isManuallyClosed: boolean; isOpen: boolean}> {
  const status = await storeStatusService.getStoreStatus();
  return {
    openingTime: status.openingTime,
    closingTime: status.closingTime,
    closedDays: status.closedDays ?? [],
    isManuallyClosed: status.isManuallyClosed,
    isOpen: status.isOpen
  };
}

/**
 * Minimum notice of each product id, in hours (null = none): the product's
 * own value, else its category's, else the lechon default for the lechon
 * categories.
 */
async function noticeByProductId(
  productIds: string[],
  rules: OrderingRules
): Promise<Map<string, number | null>> {
  const products = await productRepository.findManyByIds(productIds);
  const keys = Array.from(new Set(products.map(p => slugifyCategoryName(p.category ?? ''))));
  const categories = await CategoryModel.find({key: {$in: keys}}).lean().exec();
  const categoryNotice = new Map(categories.map(c => [c.key, c.minNoticeHours ?? null]));

  const out = new Map<string, number | null>();
  for (const p of products) {
    const own = typeof p.minNoticeHours === 'number' ? p.minNoticeHours : null;
    const cat = categoryNotice.get(slugifyCategoryName(p.category ?? ''));
    let notice = own ?? (typeof cat === 'number' ? cat : null);
    if (notice === null && isPreOrderCategory(p.category)) {
      notice = rules.lechonDefaultNoticeHours || null;
    }
    out.set(String(p._id), notice && notice > 0 ? notice : null);
  }
  return out;
}

/**
 * Cart lines priced server-side (promos applied) with their notice hours.
 * A bundle line counts at the bundle's price and needs the longest notice of
 * the products inside it (a lechon bundle still needs the lechon notice).
 */
async function ruleItems(items: ScheduleCartItem[], rules: OrderingRules) {
  const priced = items.map(i => ({productId: i.productId, quantity: i.quantity, price: 0}));
  await applyServerPrices(priced);
  const bundles = await loadActiveBundles(priced.map(i => i.productId));
  const componentIds = [...bundles.values()].flatMap(b => b.components.map(c => c.productId));
  const notices = await noticeByProductId(
    [...priced.map(i => i.productId), ...componentIds],
    rules
  );
  const noticeOf = (productId: string): number | null => {
    const bundle = bundles.get(productId);
    if (!bundle) return notices.get(productId) ?? null;
    const hours = bundle.components
      .map(c => notices.get(c.productId))
      .filter((h): h is number => typeof h === 'number');
    return hours.length > 0 ? Math.max(...hours) : null;
  };
  return priced.map(i => ({
    lineTotal: i.price * i.quantity,
    noticeHours: noticeOf(i.productId)
  }));
}

export type ScheduledOrderFields = {
  schedule: {
    timing: 'asap' | 'scheduled';
    tier: 'standard' | 'bulk' | 'lechon';
    leadMinutes: number;
    slotLabel: string | null;
  };
  scheduledAt: Date | null;
};

export const orderScheduleService = {
  storeHours,

  async getRules(): Promise<OrderingRules> {
    return settingsService.getOrderingRules();
  },

  /**
   * What the cart needs and which slots it may take over the next days.
   * Drives the checkout slot picker (customer and guest).
   */
  async quote(items: ScheduleCartItem[], orderType: ScheduleOrderType, now = new Date()) {
    const rules = await settingsService.getOrderingRules();
    const store = await storeHours();
    const req = await this.requirementFor(items, orderType, rules);
    const today = storeDayKey(now);
    const days = [];
    for (let i = 0; i <= rules.maxDaysAhead; i++) {
      const day = addDays(today, i);
      const closed = isClosedDay(day, store);
      days.push({
        day,
        closed,
        slots: slotsForDay(day, now, req, rules, store).map(s => ({
          time: s.time,
          label: s.label,
          at: s.at,
          available: s.available
        }))
      });
    }
    const first = firstAvailableSlot(now, req, rules, store);
    return {
      requirement: req,
      asapAllowed: !req.advanceOnly,
      storeOpenNow: store.isOpen,
      firstAvailable: first ? {day: storeDayKey(first.at), time: first.time, at: first.at} : null,
      firstAvailableLabel: first ? formatStoreDateTime(first.at) : null,
      days,
      rules,
      store: {
        openingTime: store.openingTime,
        closingTime: store.closingTime,
        closedDays: store.closedDays
      }
    };
  },

  async requirementFor(
    items: ScheduleCartItem[],
    orderType: ScheduleOrderType,
    rules?: OrderingRules
  ): Promise<ScheduleRequirement> {
    const r = rules ?? (await settingsService.getOrderingRules());
    return scheduleRequirement(await ruleItems(items, r), r, orderType === 'delivery');
  },

  /**
   * Validates the checkout timing and returns the fields to store on the
   * order. Throws a 400 the checkout can show as-is.
   */
  async resolveForNewOrder(input: {
    items: ScheduleCartItem[];
    orderType: ScheduleOrderType;
    timing: unknown;
    scheduledDate: unknown;
    scheduledTime: unknown;
    now?: Date;
  }): Promise<ScheduledOrderFields> {
    const now = input.now ?? new Date();
    const rules = await settingsService.getOrderingRules();
    const store = await storeHours();
    const req = await this.requirementFor(input.items, input.orderType, rules);
    const timing = input.timing === 'scheduled' ? 'scheduled' : 'asap';

    if (timing === 'asap') {
      if (req.advanceOnly) {
        const first = firstAvailableSlot(now, req, rules, store);
        throw new ApiError(
          400,
          'ADVANCE_ORDER_REQUIRED',
          `${req.tier === 'lechon' ? 'Lechon needs' : 'Large orders need'} advance notice. Please choose Pre-order and pick a date${
            first ? ` (available starting ${formatStoreDateTime(first.at)})` : ''
          }.`
        );
      }
      if (!store.isOpen) {
        throw new ApiError(
          423,
          'STORE_CLOSED',
          store.isManuallyClosed
            ? 'Store is temporarily closed. You can still pre-order for a later time.'
            : 'Store is currently closed. You can still pre-order for a later time.'
        );
      }
      return {
        schedule: {timing: 'asap', tier: req.tier, leadMinutes: req.leadMinutes, slotLabel: null},
        scheduledAt: null
      };
    }

    const check = checkRequestedSlot({
      day: input.scheduledDate,
      time: input.scheduledTime,
      now,
      req,
      rules,
      store
    });
    if (!check.ok) throw new ApiError(400, check.code, check.message);
    return {
      schedule: {
        timing: 'scheduled',
        tier: req.tier,
        leadMinutes: req.leadMinutes,
        slotLabel: check.label
      },
      scheduledAt: check.at
    };
  },

  /** Pickup / dine-in / delivery time of an order, if it has one. */
  pickupAtOf(order: Pick<OrderDocument, 'preOrder' | 'scheduledAt'>): Date | null {
    const at = order.preOrder?.pickupAt ?? order.scheduledAt ?? null;
    return at ? new Date(at) : null;
  },

  /** Payment deadline of a dated order confirmed at `confirmedAt`, or null. */
  async paymentDueAt(
    order: Pick<OrderDocument, 'preOrder' | 'scheduledAt'>,
    confirmedAt: Date
  ): Promise<Date | null> {
    const pickupAt = this.pickupAtOf(order);
    if (!pickupAt) return null;
    const rules = await settingsService.getOrderingRules();
    const store = await storeHours();
    return paymentDueAtFor({confirmedAt, pickupAt, rules, store});
  }
};
