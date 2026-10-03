/**
 * Rewards economy — DISPLAY values for the customer UI.
 *
 * All point maths (earn rate, reward cost, rounding) is computed on the
 * server in `backend/api/config/rewards.ts`, which is the single source of
 * truth. The frontend never calculates points — the API sends
 * `pointsRequired` per reward. This file only holds the customer-facing
 * copy so the wording lives in one place per app.
 *
 * When you change the earn rate or reward rate on the backend, update the
 * matching copy below.
 */

/** Points earned per ₱1 spent. Mirrors POINTS_PER_PESO on the backend. */
export const POINTS_PER_PESO = 1;

/** What 100 points are worth in pesos. Mirrors the backend reward rate. */
export const POINTS_REDEEM_VALUE_LABEL = '100 points = ₱5';

/** The banner under the points balance. */
export const REWARDS_BANNER_TEXT =
  'Earn 1 point for every ₱1 you spend (delivery fees not included). Redeem them for your favorite dishes!';

/** Reward value footnote shown under the catalog. */
export const REWARDS_VALUE_FOOTNOTE =
  'Rewards are worth 5% of the menu price (100 points = ₱5) and can only be redeemed in-store.';

/** Builds the banner copy from the earn rate so it can never drift. */
export function buildEarnBannerText(pointsPerPeso = POINTS_PER_PESO): string {
  const perPeso = pointsPerPeso === 1 ? '₱1' : `₱${1 / pointsPerPeso}`;
  return `Earn ${pointsPerPeso} point${
    pointsPerPeso === 1 ? '' : 's'
  } for every ${perPeso} you spend (delivery fees not included). Redeem them for your favorite dishes!`;
}