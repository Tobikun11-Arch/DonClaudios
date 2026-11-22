/*
 * IN-STORE PAYMENT deadline rule. MIRRORS backend/api/config/inStorePayment.ts
 * (the backend computes the actual due date; this copy only explains the
 * rule to the customer). Change both together.
 */
export const IN_STORE_PAYMENT_RULE = {
  regularHours: 3,
  preOrderHours: 24,
  daysBeforePickup: 2,
  minLeadMinutes: 60,
  /** In-store balance (after a down payment) is due this many hours before a dated pickup. */
  balanceHoursBeforePickup: 0
} as const;

/** e.g. "Mon, Nov 16, 2026, 3:00 PM" in Philippine time. */
export function formatManilaDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/** One-line explanation of how the deadline was set. */
export function inStoreRuleText(input: {
  isPreOrderCart: boolean;
  hasPickupDate: boolean;
}): string {
  const r = IN_STORE_PAYMENT_RULE;
  if (!input.isPreOrderCart) {
    return `In-store payment is due within ${r.regularHours} hours of the store confirming your order.`;
  }
  return input.hasPickupDate
    ? 'Dated orders have one payment deadline (online or in store), set when the store confirmed your order and always before your time slot. Unpaid orders are cancelled automatically.'
    : `In-store payment is due within ${r.preOrderHours} hours of the store confirming your order.`;
}
