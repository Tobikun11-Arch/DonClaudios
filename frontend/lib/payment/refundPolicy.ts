/*
 * PRE-ORDER CANCELLATION & REFUND POLICY. MIRRORS
 * backend/api/config/refundPolicy.ts (the backend computes every refund) and
 * the Return & Refund Policy page. Change all three together.
 */
export const PRE_ORDER_REFUND_POLICY = {
  earlyRefundRatio: 1,
  lateRetainedRatio: 0.5,
  refundFeeWhenCustomerCancels: false
} as const;

export type RefundPolicyCase = 'early' | 'late' | 'store' | 'no_show';

export const REFUND_POLICY_LABELS: Record<RefundPolicyCase, string> = {
  early: 'Cancelled before the cut-off: full refund of the order amount',
  late: 'Late cancellation: the down payment is kept',
  store: 'Cancelled by the store: full refund, service fees included',
  no_show: 'Customer did not show up: the down payment is kept'
};

/** Short policy summary shown next to every cancel button. */
export function refundPolicySummary(cutoffDays: number, downPaymentPercent?: number): string[] {
  const keep = downPaymentPercent ?? Math.round(PRE_ORDER_REFUND_POLICY.lateRetainedRatio * 100);
  return [
    `Up to ${cutoffDays} days before pickup: cancel any time and get back the full amount you paid. Online service fees are not refunded.`,
    `Less than ${cutoffDays} days before pickup: you can ask the store to cancel. If approved, the ${keep}% down payment is kept and anything paid above it is refunded.`,
    'If the store cancels your order, you get everything back, service fees included.',
    `If you do not show up at pickup, the store keeps the ${keep}% down payment and refunds anything paid above it.`,
    'Online payments go back to the same GCash, Maya, card, etc. Cash paid at the store is returned at the counter.'
  ];
}
