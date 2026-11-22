/*
 * DOWN PAYMENT RULES, one per order flow. MIRRORED in
 * frontend/lib/payment/downPaymentRules.ts. Change both together.
 *
 *   preorder     Holiday (dated) pre-orders, and carts made only of pre-order products
 *   pickup       regular menu orders picked up at the store
 *   delivery     regular menu orders delivered by the store / a courier
 *   reservation  regular menu orders for a reservation
 *
 *   mode off       full payment only
 *   mode optional  the customer may pay the down payment instead of the full amount
 *   mode required  like optional, but "cash on pick-up" (pay nothing now) is not
 *                  offered: the customer pays at least the down payment first.
 *                  Only differs from optional for pick-up, the one flow that
 *                  can be paid entirely later.
 *
 *   minOrder       the rule applies only to orders of at least this total (0 = all)
 */
import {
  DEFAULT_DOWN_PAYMENT_PERCENT,
  isValidDownPaymentPercent,
  resolveDownPaymentPercent
} from './paymentFees';

export const DOWN_PAYMENT_FLOWS = ['preorder', 'pickup', 'delivery', 'reservation'] as const;
export type DownPaymentFlow = (typeof DOWN_PAYMENT_FLOWS)[number];

export const DOWN_PAYMENT_MODES = ['off', 'optional', 'required'] as const;
export type DownPaymentMode = (typeof DOWN_PAYMENT_MODES)[number];

export interface DownPaymentRule {
  mode: DownPaymentMode;
  percent: number;
  minOrder: number;
}

export type DownPaymentRules = Record<DownPaymentFlow, DownPaymentRule>;

export const DOWN_PAYMENT_MIN_ORDER_MAX = 1_000_000;

/** Defaults keep the old behaviour: only pre-orders may pay a down payment. */
export const DEFAULT_DOWN_PAYMENT_RULES: DownPaymentRules = {
  preorder: {mode: 'optional', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0},
  pickup: {mode: 'off', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0},
  delivery: {mode: 'off', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0},
  reservation: {mode: 'off', percent: DEFAULT_DOWN_PAYMENT_PERCENT, minOrder: 0}
};

function resolveRule(saved: unknown, fallback: DownPaymentRule): DownPaymentRule {
  const s = (saved ?? {}) as Partial<DownPaymentRule>;
  const mode = DOWN_PAYMENT_MODES.includes(s.mode as DownPaymentMode)
    ? (s.mode as DownPaymentMode)
    : fallback.mode;
  const minOrder =
    typeof s.minOrder === 'number' && Number.isFinite(s.minOrder) && s.minOrder >= 0
      ? Math.min(Math.floor(s.minOrder), DOWN_PAYMENT_MIN_ORDER_MAX)
      : fallback.minOrder;
  return {
    mode,
    percent: isValidDownPaymentPercent(s.percent) ? s.percent : fallback.percent,
    minOrder
  };
}

/**
 * The live rules from the saved settings. Stores that saved only the old
 * single pre-order percent (SiteSetting.downPaymentPercent) keep it.
 */
export function resolveDownPaymentRules(saved: {
  downPaymentRules?: unknown;
  downPaymentPercent?: unknown;
}): DownPaymentRules {
  const rules = (saved.downPaymentRules ?? {}) as Partial<Record<DownPaymentFlow, unknown>>;
  const legacyPreorder: DownPaymentRule = {
    ...DEFAULT_DOWN_PAYMENT_RULES.preorder,
    percent: resolveDownPaymentPercent(saved.downPaymentPercent)
  };
  return {
    preorder: resolveRule(rules.preorder, legacyPreorder),
    pickup: resolveRule(rules.pickup, DEFAULT_DOWN_PAYMENT_RULES.pickup),
    delivery: resolveRule(rules.delivery, DEFAULT_DOWN_PAYMENT_RULES.delivery),
    reservation: resolveRule(rules.reservation, DEFAULT_DOWN_PAYMENT_RULES.reservation)
  };
}

/** Whether a rule lets an order of this total pay a down payment. */
export function ruleApplies(rule: DownPaymentRule, totalAmount: number) {
  return rule.mode !== 'off' && totalAmount >= rule.minOrder;
}
