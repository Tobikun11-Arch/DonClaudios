/**
 * SINGLE SOURCE OF TRUTH for the loyalty points economy.
 *
 * The owner can change every value below without touching business logic.
 * Do NOT hardcode point maths anywhere else — import from here.
 */

/* ------------------------------------------------------------------ *
 * EARNING
 * ------------------------------------------------------------------ */

/**
 * How many points a customer earns per ₱1 of EARNABLE amount.
 *
 * points_earned = Math.floor(earnable_amount * POINTS_PER_PESO)
 *
 * 1 => "1 point for every ₱1 you spend".
 */
export const POINTS_PER_PESO = 1;

/**
 * The amount of an order that actually earns points.
 *
 * The stored `order.totalAmount` INCLUDES the delivery fee, so a ₱400 food
 * order with a ₱49 delivery fee is stored as 449. The fee is pure overhead
 * and must never earn points, so we subtract it here.
 *
 * There is no tax, service charge or discount column on the order: promo
 * discounts are already baked into the food subtotal before it reaches us,
 * so a discounted order automatically earns fewer points.
 *
 * Pickup / reservation / counter orders have deliveryFee === 0, so the whole
 * total earns points.
 */
export function earnableAmountForOrder(
  totalAmount: number,
  deliveryFee?: number | null
): number {
  const gross = Number.isFinite(totalAmount) ? totalAmount : 0;
  const fee =
    typeof deliveryFee === 'number' && Number.isFinite(deliveryFee) && deliveryFee > 0
      ? deliveryFee
      : 0;
  return Math.max(0, gross - fee);
}

/**
 * Points earned for an order's earnable amount. Floored per the spec:
 * points_earned = Math.floor(earnable_amount)
 */
export function pointsEarnedForAmount(earnableAmount: number): number {
  if (!Number.isFinite(earnableAmount) || earnableAmount <= 0) {
    return 0;
  }
  return Math.floor(earnableAmount * POINTS_PER_PESO);
}

/**
 * Convenience wrapper for the award site: order total + fee straight in.
 */
export function pointsEarnedForOrder(
  totalAmount: number,
  deliveryFee?: number | null
): number {
  return pointsEarnedForAmount(earnableAmountForOrder(totalAmount, deliveryFee));
}

/* ------------------------------------------------------------------ *
 * REWARD COSTS — STORED, NOT COMPUTED AT RUNTIME
 * ------------------------------------------------------------------ */

/**
 * Each reward's point cost lives on the product as `pointsCost` and is
 * editable by the owner. There is deliberately NO runtime formula here.
 *
 * The constants below are used exactly ONCE, by
 * `scripts/backfillRewardPointsCost.ts`, to seed the initial values.
 */
export const INITIAL_REWARD_POINTS_MULTIPLIER = 20;
export const INITIAL_REWARD_POINTS_ROUNDING = 50;

/** Round to the nearest INITIAL_REWARD_POINTS_ROUNDING multiple. */
export function roundToInitialRewardRounding(value: number): number {
  return (
    Math.round(value / INITIAL_REWARD_POINTS_ROUNDING) *
    INITIAL_REWARD_POINTS_ROUNDING
  );
}

/**
 * BACKFILL ONLY — do not call this when serving a reward.
 *
 * seeds pointsCost = round(price * 20, nearest 50), never less than one
 * rounding step so a free/zero-priced item still has a sane non-zero cost.
 *
 *   ₱250 dish => 250 * 20 = 5,000
 *   ₱400 dish => 400 * 20 = 8,000
 */
export function initialPointsCostForPrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) {
    return INITIAL_REWARD_POINTS_ROUNDING;
  }
  const raw = price * INITIAL_REWARD_POINTS_MULTIPLIER;
  return Math.max(
    INITIAL_REWARD_POINTS_ROUNDING,
    roundToInitialRewardRounding(raw)
  );
}

/**
 * Fallback used only if a product somehow has no stored `pointsCost`
 * (e.g. added straight to the DB without going through the backfill).
 * Keeps the catalog usable instead of rendering a reward as free.
 */
export function fallbackPointsCost(productPrice: number): number {
  return initialPointsCostForPrice(productPrice);
}

/* ------------------------------------------------------------------ *
 * DISPLAY ONLY
 * ------------------------------------------------------------------ */

/**
 * What 100 points are worth in pesos when redeemed in-store.
 * 100 points = ₱5 => a 5% reward rate. Display/valuation only — the actual
 * price of a reward is whatever the owner set on `product.pointsCost`.
 */
export const POINTS_PER_PESO_REWARD_VALUE = 0.05;

/** What a given point balance is worth in pesos at the counter. */
export function pesoValueOfPoints(points: number): number {
  if (!Number.isFinite(points) || points <= 0) {
    return 0;
  }
  return (points / 100) * POINTS_PER_PESO_REWARD_VALUE;
}

/** The banner / tooltip copy. Keep in sync with frontend/config/rewards.ts */
export const REWARDS_EARN_COPY =
  'Earn 1 point for every ₱1 you spend (delivery fees not included). Redeem them for your favorite dishes!';