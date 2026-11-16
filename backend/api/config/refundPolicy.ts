/*
 * PRE-ORDER CANCELLATION & REFUND POLICY. MIRRORED in
 * frontend/lib/payment/refundPolicy.ts and described to customers on the
 * Return & Refund Policy page (frontend/features/legal/content/return-policy.ts).
 * Change all three together.
 *
 *   Customer cancels on or before the date's cut-off (PreOrderEvent
 *   cancelCutoffDays, default 14 days before pickup)
 *     -> self-service, 100% of the order amount paid is refunded.
 *   Customer asks to cancel after the cut-off (until pickup)
 *     -> a REQUEST the owner approves or declines. If approved, the store
 *        keeps the down payment (the order's down payment %, default 50%);
 *        anything paid above it is refunded.
 *   Store cancels (cannot fulfil, date closed, ...)
 *     -> 100% refunded, including the Xendit service fee.
 *   Xendit service fees are not refunded when the customer cancels (Xendit
 *   does not return them to the store).
 *   Online payments go back through Xendit; cash paid in store is refunded
 *   in cash at the counter and the owner marks it as given.
 */
export const PRE_ORDER_REFUND_POLICY = {
  /** Share of the order amount refunded when cancelled before the cut-off. */
  earlyRefundRatio: 1,
  /** Share of the order TOTAL the store keeps on an approved late cancellation. */
  lateRetainedRatio: 0.5,
  /** Xendit service fees are refunded only when the store cancels. */
  refundFeeWhenCustomerCancels: false
} as const;

export type RefundPolicyCase = 'early' | 'late' | 'store';

export type RefundablePayment = {
  id: string;
  /** Order portion of the payment (excludes the service fee). */
  amount: number;
  transactionFee: number;
};

export type RefundPlan = {
  policy: RefundPolicyCase;
  /** Order amount paid so far (online + cash). */
  paid: number;
  /** Order amount the store keeps. */
  retained: number;
  /** Per online payment: what goes back through Xendit (fee included if refunded). */
  online: Array<{paymentId: string; amount: number}>;
  onlineTotal: number;
  /** Cash to hand back at the counter. */
  cash: number;
  /** Service fees refunded (store cancels) or kept by Xendit. */
  feesRefunded: number;
  feesNotRefunded: number;
  /** Everything the customer gets back. */
  refundTotal: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Splits a cancellation refund between Xendit and cash. The retained amount
 * is taken from cash first (the store already holds it), then from the
 * online payments in order.
 */
export function computeRefundPlan(input: {
  policy: RefundPolicyCase;
  /** Down payment % kept on a late cancellation; defaults to lateRetainedRatio. */
  retainedPercent?: number;
  totalAmount: number;
  amountPaid: number;
  onlinePayments: RefundablePayment[];
}): RefundPlan {
  const P = PRE_ORDER_REFUND_POLICY;
  const paid = Math.max(0, input.amountPaid);
  const onlinePaid = input.onlinePayments.reduce((s, p) => s + p.amount, 0);
  const cashPaid = Math.max(0, round2(paid - onlinePaid));

  let retained = 0;
  if (input.policy === 'early') retained = paid * (1 - P.earlyRefundRatio);
  if (input.policy === 'late') {
    const ratio =
      typeof input.retainedPercent === 'number' ? input.retainedPercent / 100 : P.lateRetainedRatio;
    retained = Math.min(paid, Math.ceil(input.totalAmount * ratio));
  }
  retained = round2(retained);

  const refundFee =
    input.policy === 'store' || P.refundFeeWhenCustomerCancels;

  let toKeep = retained;
  const keepFromCash = Math.min(cashPaid, toKeep);
  toKeep -= keepFromCash;
  const cash = round2(cashPaid - keepFromCash);

  let feesRefunded = 0;
  let feesNotRefunded = 0;
  const online = input.onlinePayments.map(p => {
    const keep = Math.min(p.amount, toKeep);
    toKeep -= keep;
    const back = round2(p.amount - keep);
    // A fee is only refunded together with its (fully refunded) payment.
    const fee = refundFee && keep === 0 ? p.transactionFee : 0;
    feesRefunded += fee;
    feesNotRefunded += p.transactionFee - fee;
    return {paymentId: p.id, amount: round2(back + fee)};
  });
  const onlineTotal = round2(online.reduce((s, o) => s + o.amount, 0));

  return {
    policy: input.policy,
    paid: round2(paid),
    retained,
    online: online.filter(o => o.amount > 0),
    onlineTotal,
    cash,
    feesRefunded: round2(feesRefunded),
    feesNotRefunded: round2(feesNotRefunded),
    refundTotal: round2(onlineTotal + cash)
  };
}
