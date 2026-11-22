/*
 * ORDER SCHEDULING RULES: SINGLE SOURCE OF TRUTH (backend).
 * MIRRORED in frontend/lib/orders/orderSchedule.ts: change both together.
 * The backend copy enforces; the frontend copy only draws the slot picker and
 * the notices.
 *
 * - Slots are hourly and come from Store Status: first = opening + 1 h,
 *   last = closing - 1 h. Closed days have no slots.
 * - Every scheduled order needs a lead time (order time -> slot). How long
 *   depends on the cart, and the strictest rule wins:
 *     standard  small cart        -> `standardLeadMinutes`
 *     bulk      subtotal >= ₱X    -> `bulkLeadHours`
 *     lechon    item with notice  -> that item's minimum notice
 *   Bulk / lechon carts cannot be ASAP, and on any later day their earliest
 *   slot is never before opening + `nextDayEarliestHoursAfterOpen` (so a 7 PM
 *   or 10 PM order is ready the next afternoon, not first thing in the morning).
 * - Delivery adds `deliveryExtraMinutes` for the trip.
 * - Payment deadline of a dated order (see paymentDueAtFor).
 *
 * All times are store-local (Asia/Manila, UTC+8, no DST).
 */

export const STORE_TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export type OrderingRules = {
  /** Subtotal (₱, after promos) from which a cart counts as a bulk order. */
  bulkMinSubtotal: number;
  /** Lead time of a small scheduled order, in minutes. */
  standardLeadMinutes: number;
  /** Lead time of a bulk order, in hours. */
  bulkLeadHours: number;
  /** Bulk / lechon on a later day: earliest slot = opening + this many hours. */
  nextDayEarliestHoursAfterOpen: number;
  /** Extra lead time for delivery orders, in minutes. */
  deliveryExtraMinutes: number;
  /** How far ahead a customer may schedule, in days. */
  maxDaysAhead: number;
  /** Default minimum notice (hours) of the lechon categories when unset. */
  lechonDefaultNoticeHours: number;
  /** Dated orders: normal time to pay after the cashier confirms, in hours. */
  paymentWindowHours: number;
  /** Dated orders: never less than this to pay after confirmation, in hours. */
  paymentMinWindowHours: number;
  /** Dated orders: payment should be in this many hours before the slot. */
  paymentCutoffHoursBeforeSlot: number;
  /** Reminder this many minutes before the payment deadline. */
  reminderMinutesBefore: number;
};

export const DEFAULT_ORDERING_RULES: OrderingRules = {
  bulkMinSubtotal: 3000,
  standardLeadMinutes: 120,
  bulkLeadHours: 8,
  nextDayEarliestHoursAfterOpen: 3,
  deliveryExtraMinutes: 60,
  maxDaysAhead: 30,
  lechonDefaultNoticeHours: 8,
  paymentWindowHours: 24,
  paymentMinWindowHours: 2,
  paymentCutoffHoursBeforeSlot: 3,
  reminderMinutesBefore: 60
};

/** Allowed range of every rule: [min, max] (whole numbers). */
export const ORDERING_RULE_LIMITS: Record<keyof OrderingRules, [number, number]> = {
  bulkMinSubtotal: [100, 1_000_000],
  standardLeadMinutes: [0, 24 * 60],
  bulkLeadHours: [1, 72],
  nextDayEarliestHoursAfterOpen: [1, 12],
  deliveryExtraMinutes: [0, 240],
  maxDaysAhead: [1, 90],
  lechonDefaultNoticeHours: [0, 72],
  paymentWindowHours: [1, 72],
  paymentMinWindowHours: [1, 12],
  paymentCutoffHoursBeforeSlot: [0, 48],
  reminderMinutesBefore: [5, 24 * 60]
};

/** Saved rules with defaults filled in for unset / out-of-range values. */
export function resolveOrderingRules(saved?: Partial<OrderingRules> | null): OrderingRules {
  const out = {...DEFAULT_ORDERING_RULES};
  for (const key of Object.keys(DEFAULT_ORDERING_RULES) as (keyof OrderingRules)[]) {
    const value = saved?.[key];
    const [min, max] = ORDERING_RULE_LIMITS[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
      out[key] = value;
    }
  }
  return out;
}

export type OrderTier = 'standard' | 'bulk' | 'lechon';
export type OrderTiming = 'asap' | 'scheduled';

export type StoreHours = {
  openingTime: string; // "HH:MM"
  closingTime: string; // "HH:MM"
  closedDays: number[]; // 0 = Sunday
};

/** "HH:MM" -> minutes after midnight (null when malformed). */
export function timeToMinutes(value: string | null | undefined): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((value ?? '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes after midnight -> "HH:MM". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "13:00" -> "1:00 PM". */
export function formatSlotTime(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes === null) return time;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Store-local calendar day of an instant, "YYYY-MM-DD". */
export function storeDayKey(instant: Date): string {
  return new Date(instant.getTime() + STORE_TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Store-local minutes after midnight of an instant. */
function storeMinutesOfDay(instant: Date): number {
  const shifted = new Date(instant.getTime() + STORE_TZ_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Store-local day of week (0 = Sunday) of a "YYYY-MM-DD". */
function dayOfWeek(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** UTC instant of store-local "YYYY-MM-DD" + minutes after midnight. */
export function storeInstant(day: string, minutes: number): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutes) - STORE_TZ_OFFSET_MS);
}

/** "YYYY-MM-DD" + n days. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
}

export function isValidDayKey(day: unknown): day is string {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split('-').map(Number);
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

function hoursOf(store: StoreHours) {
  const open = timeToMinutes(store.openingTime) ?? 8 * 60;
  let close = timeToMinutes(store.closingTime) ?? 22 * 60;
  if (close <= open) close = 24 * 60 - 1; // overnight / bad data: treat as open until midnight
  return {open, close};
}

export function isClosedDay(day: string, store: StoreHours): boolean {
  return (store.closedDays ?? []).includes(dayOfWeek(day));
}

/** Hourly slot times ("HH:MM") of a day: opening + 1 h ... closing - 1 h. */
export function slotTimesForDay(day: string, store: StoreHours): string[] {
  if (isClosedDay(day, store)) return [];
  const {open, close} = hoursOf(store);
  const times: string[] = [];
  for (let t = open + 60; t <= close - 60; t += 60) times.push(minutesToTime(t));
  return times;
}

export type CartRuleItem = {
  /** Line total after promos (price x quantity). */
  lineTotal: number;
  /** Minimum notice of this product in hours (product override, else category), or null. */
  noticeHours: number | null;
};

export type ScheduleRequirement = {
  tier: OrderTier;
  /** Lead time from order time to slot, in minutes (delivery trip included). */
  leadMinutes: number;
  /** Bulk / lechon: ASAP not allowed and the next-day floor applies. */
  advanceOnly: boolean;
  subtotal: number;
  /** Largest product notice in the cart, in hours (0 when none). */
  noticeHours: number;
};

/** What the cart needs: tier, lead time and whether ASAP is allowed. */
export function scheduleRequirement(
  items: CartRuleItem[],
  rules: OrderingRules,
  isDelivery: boolean
): ScheduleRequirement {
  const subtotal = items.reduce((sum, i) => sum + Math.max(0, i.lineTotal || 0), 0);
  const noticeHours = items.reduce((max, i) => Math.max(max, i.noticeHours ?? 0), 0);
  const isBulk = subtotal >= rules.bulkMinSubtotal;

  let tier: OrderTier = 'standard';
  let lead = rules.standardLeadMinutes;
  if (isBulk && rules.bulkLeadHours * 60 > lead) {
    tier = 'bulk';
    lead = rules.bulkLeadHours * 60;
  }
  if (noticeHours > 0 && noticeHours * 60 >= lead) {
    tier = 'lechon';
    lead = noticeHours * 60;
  }
  if (isBulk && tier === 'standard') tier = 'bulk';
  if (isDelivery) lead += rules.deliveryExtraMinutes;

  return {
    tier,
    leadMinutes: lead,
    advanceOnly: isBulk || noticeHours > 0,
    subtotal,
    noticeHours
  };
}

/** First day after `day` the store is open (within a week), or null. */
function nextOpenDay(day: string, store: StoreHours): string | null {
  for (let i = 1; i <= 7; i++) {
    const next = addDays(day, i);
    if (!isClosedDay(next, store)) return next;
  }
  return null;
}

/**
 * May this cart, ordered at `now`, take the slot starting at `at` on `day`?
 *   - the slot must be at least the lead time away;
 *   - bulk / lechon on the first open day after the order day: not before
 *     opening + N hours (no "next morning" rush for evening / night orders).
 */
export function isSlotAllowed(
  at: Date,
  day: string,
  now: Date,
  req: ScheduleRequirement,
  rules: OrderingRules,
  store: StoreHours
): boolean {
  if (at.getTime() < now.getTime() + req.leadMinutes * MIN) return false;
  if (!req.advanceOnly) return true;
  const today = storeDayKey(now);
  if (day !== today && day === nextOpenDay(today, store)) {
    const floor = storeInstant(day, hoursOf(store).open + rules.nextDayEarliestHoursAfterOpen * 60);
    if (at.getTime() < floor.getTime()) return false;
  }
  return true;
}

export type SlotState = {time: string; label: string; at: Date; available: boolean};

/** Every slot of a day with whether this cart may take it. */
export function slotsForDay(
  day: string,
  now: Date,
  req: ScheduleRequirement,
  rules: OrderingRules,
  store: StoreHours
): SlotState[] {
  return slotTimesForDay(day, store).map(time => {
    const at = storeInstant(day, timeToMinutes(time) as number);
    return {
      time,
      label: formatSlotTime(time),
      at,
      available: isSlotAllowed(at, day, now, req, rules, store)
    };
  });
}

/** First slot this cart may take (within maxDaysAhead), or null. */
export function firstAvailableSlot(
  now: Date,
  req: ScheduleRequirement,
  rules: OrderingRules,
  store: StoreHours
): SlotState | null {
  const today = storeDayKey(now);
  for (let i = 0; i <= rules.maxDaysAhead; i++) {
    const slot = slotsForDay(addDays(today, i), now, req, rules, store).find(s => s.available);
    if (slot) return slot;
  }
  return null;
}

/** "Nov 20, 1:00 PM" in store time. */
export function formatStoreDateTime(instant: Date): string {
  return instant.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export type SlotCheck =
  | {ok: true; at: Date; label: string}
  | {ok: false; code: string; message: string};

/** Validates a customer's chosen day + slot for this cart. */
export function checkRequestedSlot(input: {
  day: unknown;
  time: unknown;
  now: Date;
  req: ScheduleRequirement;
  rules: OrderingRules;
  store: StoreHours;
}): SlotCheck {
  const {day, time, now, req, rules, store} = input;
  if (!isValidDayKey(day) || typeof time !== 'string' || timeToMinutes(time) === null) {
    return {ok: false, code: 'SLOT_REQUIRED', message: 'Choose a date and time for your order.'};
  }
  const today = storeDayKey(now);
  if (day < today || day > addDays(today, rules.maxDaysAhead)) {
    return {
      ok: false,
      code: 'SLOT_OUT_OF_RANGE',
      message: `Choose a date within the next ${rules.maxDaysAhead} days.`
    };
  }
  if (isClosedDay(day, store)) {
    return {ok: false, code: 'STORE_CLOSED_DAY', message: 'The store is closed on that day. Please pick another date.'};
  }
  const normalized = minutesToTime(timeToMinutes(time) as number);
  const slot = slotsForDay(day, now, req, rules, store).find(s => s.time === normalized);
  if (!slot) {
    return {ok: false, code: 'SLOT_INVALID', message: 'That time is outside store hours. Please pick one of the listed times.'};
  }
  if (!slot.available) {
    const first = firstAvailableSlot(now, req, rules, store);
    return {
      ok: false,
      code: 'SLOT_TOO_SOON',
      message: first
        ? `Date too soon. Available starting ${formatStoreDateTime(first.at)}.`
        : 'Date too soon. Please choose a later date.'
    };
  }
  return {ok: true, at: slot.at, label: slot.label};
}

/* ------------------------------------------------------------------ *
 * PAYMENT DEADLINE (dated orders: scheduled + owner pre-orders)
 * ------------------------------------------------------------------ */

/** Latest instant <= t inside payable hours (opening + 1 h ... closing). */
function latestPayableAtOrBefore(t: Date, store: StoreHours): Date | null {
  const {open, close} = hoursOf(store);
  let day = storeDayKey(t);
  for (let i = 0; i < 8; i++) {
    if (!isClosedDay(day, store)) {
      const start = storeInstant(day, open + 60);
      const end = storeInstant(day, close);
      if (t.getTime() >= start.getTime()) {
        return t.getTime() <= end.getTime() ? t : end;
      }
    }
    day = addDays(day, -1);
    t = storeInstant(day, 24 * 60 - 1);
  }
  return null;
}

/** Earliest instant >= t inside payable hours. */
function earliestPayableAtOrAfter(t: Date, store: StoreHours): Date | null {
  const {open, close} = hoursOf(store);
  let day = storeDayKey(t);
  for (let i = 0; i < 8; i++) {
    if (!isClosedDay(day, store)) {
      const start = storeInstant(day, open + 60);
      const end = storeInstant(day, close);
      if (t.getTime() <= end.getTime()) {
        return t.getTime() >= start.getTime() ? t : start;
      }
    }
    day = addDays(day, 1);
    t = storeInstant(day, 0);
  }
  return null;
}

/**
 * When the first payment (down payment or full) of a dated order is due,
 * counted from the cashier's confirmation:
 *
 *   1. confirmation + `paymentWindowHours` (default 24 h),
 *   2. but no later than `paymentCutoffHoursBeforeSlot` before the slot,
 *   3. and never sooner than `paymentMinWindowHours` after confirmation
 *      (capped at 1 h before the slot),
 *   4. moved into store hours so it can also be paid at the counter:
 *      back to the last closing time if that still leaves the minimum
 *      window, else forward to the next opening + 1 h (if before the slot).
 */
export function paymentDueAtFor(input: {
  confirmedAt: Date;
  pickupAt: Date;
  rules: OrderingRules;
  store: StoreHours;
}): Date {
  const {confirmedAt, pickupAt, rules, store} = input;
  const c = confirmedAt.getTime();
  const hardCap = pickupAt.getTime() - HOUR;
  const minDue = c + rules.paymentMinWindowHours * HOUR;

  let due = Math.min(
    c + rules.paymentWindowHours * HOUR,
    pickupAt.getTime() - rules.paymentCutoffHoursBeforeSlot * HOUR
  );
  if (due < minDue) due = Math.min(minDue, hardCap);
  // Confirmed very late: give at least 30 minutes, whatever the slot says.
  due = Math.max(due, c + 30 * MIN);

  const back = latestPayableAtOrBefore(new Date(due), store);
  if (back && back.getTime() === due) return new Date(due);
  if (back && back.getTime() >= minDue) return back;
  const forward = earliestPayableAtOrAfter(new Date(due), store);
  if (forward && forward.getTime() <= hardCap) return forward;
  return new Date(due);
}

/** When to send the "pay soon" reminder for a deadline. */
export function paymentReminderAt(input: {
  confirmedAt: Date;
  dueAt: Date;
  rules: OrderingRules;
}): Date {
  const window = input.dueAt.getTime() - input.confirmedAt.getTime();
  const before = Math.min(input.rules.reminderMinutesBefore * MIN, Math.max(0, window / 2));
  return new Date(input.dueAt.getTime() - before);
}
