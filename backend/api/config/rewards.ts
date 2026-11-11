/**
 * Loyalty points economy: defaults, limits and the point maths.
 *
 * The EARN RATE is owner-editable in Settings > Rewards and is stored on the
 * SiteSetting singleton (`rewardsEarnPoints` / `rewardsEarnPesos`). The values
 * below are only the defaults used while the owner has never saved one, and
 * the validation limits. Read the live rule with
 * `settingsService.getRewardsEarn()` and pass it to the helpers here.
 * Keep the point maths in this file — do not reimplement it elsewhere.
 */

/* ------------------------------------------------------------------ *
 * EARNING
 * ------------------------------------------------------------------ */

/**
 * Earn rule: customers earn `rewardsEarnPoints` points for every
 * `rewardsEarnPesos` pesos of EARNABLE amount.
 *
 * points_earned = Math.floor(earnable_amount * rewardsEarnPoints / rewardsEarnPesos)
 *
 * {1, 1} => "1 point for every ₱1 you spend", {1, 20} => "1 point for every ₱20".
 */
export type RewardsEarnRule = {
  rewardsEarnPoints: number;
  rewardsEarnPesos: number;
};

/** Default earn rule (1 point per ₱1). Used when the owner never saved one. */
export const DEFAULT_REWARDS_EARN_RULE: RewardsEarnRule = {
  rewardsEarnPoints: 1,
  rewardsEarnPesos: 1
};

/** Validation limits for the owner-editable earn rule (whole numbers). */
export const REWARDS_EARN_POINTS_MIN = 1;
export const REWARDS_EARN_POINTS_MAX = 1000;
export const REWARDS_EARN_PESOS_MIN = 1;
export const REWARDS_EARN_PESOS_MAX = 100_000;

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
 * Points earned for an order's earnable amount, floored:
 * points_earned = Math.floor(earnable_amount * points / pesos)
 */
export function pointsEarnedForAmount(
  earnableAmount: number,
  rule: RewardsEarnRule = DEFAULT_REWARDS_EARN_RULE
): number {
  if (!Number.isFinite(earnableAmount) || earnableAmount <= 0) {
    return 0;
  }
  const {rewardsEarnPoints: points, rewardsEarnPesos: pesos} = rule;
  if (!(points > 0) || !(pesos > 0)) {
    return 0;
  }
  return Math.floor((earnableAmount * points) / pesos);
}

/**
 * Convenience wrapper for the award site: order total + fee straight in.
 */
export function pointsEarnedForOrder(
  totalAmount: number,
  deliveryFee: number | null | undefined,
  rule: RewardsEarnRule = DEFAULT_REWARDS_EARN_RULE
): number {
  return pointsEarnedForAmount(earnableAmountForOrder(totalAmount, deliveryFee), rule);
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

/**
 * The banner / tooltip copy for an earn rule. The customer UI builds the same
 * text with `buildEarnBannerText` in frontend/config/rewards.ts.
 */
export function buildRewardsEarnCopy(
  rule: RewardsEarnRule = DEFAULT_REWARDS_EARN_RULE
): string {
  const {rewardsEarnPoints: points, rewardsEarnPesos: pesos} = rule;
  return `Earn ${points.toLocaleString('en-PH')} point${points === 1 ? '' : 's'} for every ₱${pesos.toLocaleString('en-PH')} you spend (delivery fees not included). Redeem them for your favorite dishes!`;
}