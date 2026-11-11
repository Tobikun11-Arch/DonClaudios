/**
 * Rewards economy — DISPLAY values for the customer UI.
 *
 * All point maths (earn rate, reward cost, rounding) is computed on the
 * server in `backend/api/config/rewards.ts`. The frontend never calculates
 * points — the API sends `pointsRequired` per reward.
 *
 * The EARN RATE is owner-editable (Settings > Rewards) and is fetched live
 * from `GET /settings/rewards-earn` (see `useRewardsEarnQuery`). The default
 * below only mirrors the backend default and is used while that loads.
 */

/** Owner-editable earn rule: `rewardsEarnPoints` points per `rewardsEarnPesos` pesos. */
export type RewardsEarnRule = {
  rewardsEarnPoints: number;
  rewardsEarnPesos: number;
};

/** Mirrors DEFAULT_REWARDS_EARN_RULE on the backend (1 point per ₱1). */
export const DEFAULT_REWARDS_EARN_RULE: RewardsEarnRule = {
  rewardsEarnPoints: 1,
  rewardsEarnPesos: 1
};

/** Mirrors the backend validation limits (whole numbers). */
export const REWARDS_EARN_POINTS_MIN = 1;
export const REWARDS_EARN_POINTS_MAX = 1000;
export const REWARDS_EARN_PESOS_MIN = 1;
export const REWARDS_EARN_PESOS_MAX = 100_000;

/** What 100 points are worth in pesos. Mirrors the backend reward rate. */
export const POINTS_REDEEM_VALUE_LABEL = '100 points = ₱5';

/** Reward value footnote shown under the catalog. */
export const REWARDS_VALUE_FOOTNOTE =
  'Rewards are worth 5% of the menu price (100 points = ₱5) and can only be redeemed in-store.';

/** "Earn 1 point for every ₱20 you spend" — the short earn-rate sentence. */
export function buildEarnRateText(
  points = DEFAULT_REWARDS_EARN_RULE.rewardsEarnPoints,
  pesos = DEFAULT_REWARDS_EARN_RULE.rewardsEarnPesos
): string {
  return `Earn ${points.toLocaleString('en-PH')} point${
    points === 1 ? '' : 's'
  } for every ₱${pesos.toLocaleString('en-PH')} you spend`;
}

/** The banner under the points balance, built from the live earn rule. */
export function buildEarnBannerText(
  points = DEFAULT_REWARDS_EARN_RULE.rewardsEarnPoints,
  pesos = DEFAULT_REWARDS_EARN_RULE.rewardsEarnPesos
): string {
  return `${buildEarnRateText(
    points,
    pesos
  )} (delivery fees not included). Redeem them for your favorite dishes!`;
}
