/**
 * SINGLE SOURCE OF TRUTH for the loyalty points economy.
 *
 * The owner can change every value below without touching business logic.
 * Do NOT hardcode point maths anywhere else — import from here.
 */

/**
 * EARNING
 * How many points a customer earns per ₱1 of order total.
 * points_earned = Math.floor(orderTotal * POINTS_PER_PESO)
 * Currently 1 => "1 point for every ₱1 you spend".
 */
export const POINTS_PER_PESO = 1;

/**
 * REDEMPTION VALUE
 * What 100 points are worth in pesos when redeemed in-store.
 * 100 points = ₱5 => a 5% reward rate.
 * Only used for display/valuing balances; the actual price of a reward
 * is derived from REWARD_RATE below.
 */
export const POINTS_PER_PESO_REWARD_VALUE = 0.05;

/**
 * REDEMPTION RATE
 * How many points one peso of menu price costs a customer.
 * 100 points = ₱5  =>  1 peso = 20 points  =>  MULTIPLIER = 1 / 0.05 = 20.
 * reward_points = roundToNearest50(price * POINTS_PER_PESO_REWARD_MULTIPLIER)
 *
 * Example: a ₱250 dish => 250 * 20 = 5,000 points.
 *
 * Derived from POINTS_PER_PESO_REWARD_VALUE so the two can never drift:
 * changing the reward rate to 0.10 automatically makes a ₱250 dish cost
 * 250 * (1 / 0.10) = 2,500 points.
 */
export const POINTS_PER_PESO_REWARD_MULTIPLIER =
  1 / POINTS_PER_PESO_REWARD_VALUE;

/**
 * Reward point costs are rounded to the nearest 50 points so prices stay
 * tidy and readable in the UI (e.g. 5,000 not 5,137).
 */
export const REWARD_POINTS_ROUNDING = 50;

/** The banner / tooltip copy. Keep in sync with frontend/config/rewards.ts */
export const REWARDS_EARN_COPY = 'Earn 1 point for every ₱1 you spend.';

/**
 * Points earned for an order total. Floored per the spec:
 * points_earned = Math.floor(order_total)
 */
export function pointsEarnedForOrderTotal(orderTotal: number): number {
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
    return 0;
  }
  return Math.floor(orderTotal * POINTS_PER_PESO);
}

/** Round to the nearest REWARD_POINTS_ROUNDING multiple. */
export function roundToRewardRounding(value: number): number {
  return Math.round(value / REWARD_POINTS_ROUNDING) * REWARD_POINTS_ROUNDING;
}

/**
 * Points needed to redeem an item at a given peso price.
 * Never returns less than the rounding step, so a free/zero-priced item
 * still has a non-zero, sane cost instead of being free.
 */
export function pointsCostForPrice(price: number): number {
  if (!Number.isFinite(price) || price <= 0) {
    return REWARD_POINTS_ROUNDING;
  }
  const raw = price * POINTS_PER_PESO_REWARD_MULTIPLIER;
  return Math.max(REWARD_POINTS_ROUNDING, roundToRewardRounding(raw));
}

/**
 * Points cost for a reward, honouring an owner override.
 *
 * `pointsOverride` is an explicit owner-set point cost for that specific
 * reward. When present it always wins, so an owner can price a promo or
 * irregular item at any round number they like. When absent the cost is
 * derived from the menu price.
 */
export function pointsCostForReward(
  price: number,
  pointsOverride?: number | null
): number {
  if (typeof pointsOverride === 'number' && Number.isFinite(pointsOverride)) {
    return Math.max(1, Math.round(pointsOverride));
  }
  return pointsCostForPrice(price);
}

/** What a given point balance is worth in pesos at the counter. */
export function pesoValueOfPoints(points: number): number {
  if (!Number.isFinite(points) || points <= 0) {
    return 0;
  }
  return (points / 100) * POINTS_PER_PESO_REWARD_VALUE;
}