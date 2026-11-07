/**
 * Xendit transaction fees — SINGLE SOURCE OF TRUTH (backend).
 *
 * Mirrored by `frontend/lib/payments/paymentFees.ts` (display only). The
 * backend always recomputes the charge, so the customer cannot tamper with it.
 *
 * Rates are Xendit's published PH rates. Verify them at
 * https://www.xendit.co/en-ph/pricing/ before going live and update here.
 * Xendit adds 12% VAT on its fee for every channel except ShopeePay.
 */

export const PAYMENT_CHANNELS = [
  'gcash',
  'maya',
  'grabpay',
  'shopeepay',
  'card'
] as const;

export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

type FeeRule = {
  /** Percentage of the charged amount, e.g. 0.023 for 2.3%. */
  rate: number;
  /** Fixed peso amount per transaction. */
  fixed: number;
  /** True when the published rate already includes VAT. */
  vatIncluded: boolean;
  /** Xendit Invoice `payment_methods` code. */
  xenditCode: string;
  label: string;
};

export const VAT_RATE = 0.12;

export const PAYMENT_FEES: Record<PaymentChannel, FeeRule> = {
  gcash: {rate: 0.023, fixed: 0, vatIncluded: false, xenditCode: 'GCASH', label: 'GCash'},
  maya: {rate: 0.018, fixed: 0, vatIncluded: false, xenditCode: 'PAYMAYA', label: 'Maya'},
  grabpay: {rate: 0.02, fixed: 0, vatIncluded: false, xenditCode: 'GRABPAY', label: 'GrabPay'},
  shopeepay: {rate: 0.02, fixed: 0, vatIncluded: true, xenditCode: 'SHOPEEPAY', label: 'ShopeePay'},
  card: {rate: 0.032, fixed: 10, vatIncluded: false, xenditCode: 'CREDIT_CARD', label: 'Credit/Debit card'}
};

export function isPaymentChannel(value: unknown): value is PaymentChannel {
  return (
    typeof value === 'string' &&
    (PAYMENT_CHANNELS as readonly string[]).includes(value)
  );
}

export type PaymentQuote = {
  /** The order portion being paid (full total, down payment, or balance). */
  amount: number;
  /** Xendit fee passed on to the customer. */
  transactionFee: number;
  /** What Xendit bills the customer: amount + transactionFee. */
  charge: number;
};

/**
 * Grosses the fee up so the store still nets `amount` after Xendit takes its
 * cut (Xendit charges its percentage on the whole billed amount, fee
 * included). Rounded UP to the whole peso.
 *
 *   charge = ceil((amount + fixed') / (1 - rate'))
 *
 * where rate' and fixed' include VAT when the published rate excludes it.
 */
export function computeCharge(
  amount: number,
  channel: PaymentChannel
): PaymentQuote {
  const rule = PAYMENT_FEES[channel];
  const vat = rule.vatIncluded ? 1 : 1 + VAT_RATE;
  const effectiveRate = rule.rate * vat;
  const effectiveFixed = rule.fixed * vat;
  const base = Math.ceil(amount);
  const charge = Math.ceil((base + effectiveFixed) / (1 - effectiveRate));
  return {amount: base, transactionFee: charge - base, charge};
}

/** Pre-order carts may pay this share up front; the rest is the balance. */
export const DOWN_PAYMENT_RATIO = 0.5;

export function downPaymentAmount(totalAmount: number): number {
  return Math.ceil(totalAmount * DOWN_PAYMENT_RATIO);
}
