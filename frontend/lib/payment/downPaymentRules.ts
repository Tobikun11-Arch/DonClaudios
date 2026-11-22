/*
 * DOWN PAYMENT RULES, one per order flow. MIRRORS
 * backend/api/config/downPaymentRules.ts (the backend enforces every rule).
 * Change both together.
 */

export const DOWN_PAYMENT_FLOWS = ['preorder', 'pickup', 'delivery', 'reservation'] as const;
export type DownPaymentFlow = (typeof DOWN_PAYMENT_FLOWS)[number];

export type DownPaymentMode = 'off' | 'optional' | 'required';

export interface DownPaymentRule {
  mode: DownPaymentMode;
  percent: number;
  minOrder: number;
}

export type DownPaymentRules = Record<DownPaymentFlow, DownPaymentRule>;

export const DEFAULT_DOWN_PAYMENT_PERCENT = 50;
export const DOWN_PAYMENT_PERCENT_MIN = 10;
export const DOWN_PAYMENT_PERCENT_MAX = 90;
export const DOWN_PAYMENT_MIN_ORDER_MAX = 1_000_000;

export const DEFAULT_DOWN_PAYMENT_RULES: DownPaymentRules = {
  preorder: {mode: 'optional', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0},
  pickup: {mode: 'off', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0},
  delivery: {mode: 'off', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0},
  reservation: {mode: 'off', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0}
};

/**
 * The flow an order most likely follows, from what the client knows. The
 * backend also treats carts made only of pre-order products as pre-orders;
 * the payment summary from the server is the final word.
 */
export function downPaymentFlowOf(order: {
  isPreOrder?: boolean | null;
  orderType?: string | null;
}): DownPaymentFlow {
  if (order.isPreOrder) return 'preorder';
  if (order.orderType === 'delivery' || order.orderType === 'reservation') return order.orderType;
  return 'pickup';
}

/** Whether a rule lets an order of this total pay a down payment. */
export function ruleApplies(rule: DownPaymentRule, totalAmount: number) {
  return rule.mode !== 'off' && totalAmount >= rule.minOrder;
}
