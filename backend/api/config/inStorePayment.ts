/*
 * IN-STORE PAYMENT deadline rule (cash paid at the counter before the order
 * is prepared). MIRRORED in frontend/lib/payment/inStorePayment.ts: change
 * both together.
 *
 * Philippine lechon shops usually only lock in an order once it is paid (or
 * a down payment is made) and want it settled a day or more before pickup so
 * they can source and roast the pig. So:
 *   - regular orders: pay within `regularHours` of the store confirming them;
 *   - pre-order carts (whole lechon, holiday pre-orders): within
 *     `preOrderHours` of confirmation, and never later than
 *     `daysBeforePickup` days before a dated pickup.
 * Missed deadline -> the order is cancelled automatically and its slot /
 * stock released (same as an expired online payment link).
 *
 * BALANCE after a down payment may also be paid in store: by the pickup time
 * of a dated pre-order (`balanceHoursBeforePickup` earlier), otherwise
 * before the order is released. It never auto-cancels (money is already
 * paid); the order is simply not released or dispatched until it is paid.
 */
export const IN_STORE_PAYMENT_RULE = {
  regularHours: 3,
  preOrderHours: 24,
  daysBeforePickup: 2,
  /** In-store is not offered when less than this is left before the deadline. */
  minLeadMinutes: 60,
  /** In-store balance is due this many hours before a dated pickup. */
  balanceHoursBeforePickup: 0
} as const;

const HOUR_MS = 60 * 60 * 1000;

/** Deadline for paying in store, counted from the store's confirmation. */
export function inStorePaymentDueAt(input: {
  confirmedAt: Date;
  isPreOrderCart: boolean;
  pickupAt?: Date | null;
}): Date {
  const hours = input.isPreOrderCart
    ? IN_STORE_PAYMENT_RULE.preOrderHours
    : IN_STORE_PAYMENT_RULE.regularHours;
  let due = input.confirmedAt.getTime() + hours * HOUR_MS;
  if (input.pickupAt) {
    const latest =
      input.pickupAt.getTime() -
      IN_STORE_PAYMENT_RULE.daysBeforePickup * 24 * HOUR_MS;
    due = Math.min(due, latest);
  }
  return new Date(due);
}

/** True while there is still enough time to come to the store and pay. */
export function inStorePaymentOpen(dueAt: Date, now: Date = new Date()) {
  return (
    dueAt.getTime() - now.getTime() >=
    IN_STORE_PAYMENT_RULE.minLeadMinutes * 60 * 1000
  );
}

/** In-store balance deadline: the dated pickup time, or null (before release). */
export function inStoreBalanceDueAt(pickupAt?: Date | null): Date | null {
  if (!pickupAt) return null;
  return new Date(
    pickupAt.getTime() - IN_STORE_PAYMENT_RULE.balanceHoursBeforePickup * HOUR_MS
  );
}
