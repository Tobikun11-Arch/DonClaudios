/*
 * Order scheduling: types + display helpers for the checkout slot picker and
 * the order notices. The RULES live on the server
 * (backend/api/config/orderSchedule.ts); the checkout asks
 * POST /orders/schedule/quote which slots a cart may take, so nothing here
 * decides what is allowed.
 */

export type OrderingRules = {
  bulkMinSubtotal: number;
  standardLeadMinutes: number;
  bulkLeadHours: number;
  nextDayEarliestHoursAfterOpen: number;
  deliveryExtraMinutes: number;
  maxDaysAhead: number;
  lechonDefaultNoticeHours: number;
  paymentWindowHours: number;
  paymentMinWindowHours: number;
  paymentCutoffHoursBeforeSlot: number;
  reminderMinutesBefore: number;
};

/** Same defaults as the backend; used only while the live rules load. */
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

export type OrderTier = 'standard' | 'bulk' | 'lechon';
export type OrderTiming = 'asap' | 'scheduled';

export type ScheduleSlot = {time: string; label: string; at: string; available: boolean};

export type ScheduleQuote = {
  requirement: {
    tier: OrderTier;
    leadMinutes: number;
    advanceOnly: boolean;
    subtotal: number;
    noticeHours: number;
  };
  asapAllowed: boolean;
  storeOpenNow: boolean;
  firstAvailable: {day: string; time: string; at: string} | null;
  firstAvailableLabel: string | null;
  days: {day: string; closed: boolean; slots: ScheduleSlot[]}[];
  rules: OrderingRules;
  store: {openingTime: string; closingTime: string; closedDays: number[]};
};

export type OrderSchedule = {
  timing: OrderTiming;
  tier: OrderTier;
  leadMinutes: number;
  slotLabel?: string | null;
};

const peso = (n: number) => `₱${n.toLocaleString('en-PH', {maximumFractionDigits: 0})}`;
export {peso as formatPeso};

/** "Nov 20, 1:00 PM" in store time. */
export function formatStoreDateTime(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** "Thu, Nov 20" for a "YYYY-MM-DD" store day. */
export function formatDayChip(day: string): {weekday: string; date: string} {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 4));
  return {
    weekday: dt.toLocaleDateString('en-PH', {weekday: 'short', timeZone: 'UTC'}),
    date: dt.toLocaleDateString('en-PH', {month: 'short', day: 'numeric', timeZone: 'UTC'})
  };
}

/** "8 hours", "2 hours", "90 minutes". */
export function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? '' : 's'}`;
  }
  if (minutes > 60) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${minutes} minutes`;
}

/** "1:00 PM" from "13:00". */
export function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

/** Time left until a deadline, e.g. "2 h 15 min left" (or null when passed). */
export function timeLeftLabel(deadline: string | Date | null | undefined, now = Date.now()) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.ceil(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days} d ${hours} h left`;
  if (hours > 0) return `${hours} h ${mins} min left`;
  return `${mins} min left`;
}

export const TIER_LABEL: Record<OrderTier, string> = {
  standard: 'Scheduled',
  bulk: 'Bulk order',
  lechon: 'Lechon order'
};

/** "Dine-in" / "Pick-up" / "Delivery" wording per order type. */
export function receiveWord(orderType: string | null | undefined): string {
  if (orderType === 'reservation' || orderType === 'Reservation') return 'dine-in';
  if (orderType === 'delivery' || orderType === 'Delivery') return 'delivery';
  return 'pick-up';
}
