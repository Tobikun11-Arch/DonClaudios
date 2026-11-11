// Order total limits. Keep identical to backend/api/config/orderLimits.ts,
// which enforces the same rules when the order is created.

/** Smallest order anyone (guest or customer) can place, in pesos. */
export const MIN_ORDER_TOTAL = 100;

/** Largest order a guest can place, in pesos. Customers have no maximum. */
export const GUEST_MAX_ORDER_TOTAL = 1000;

const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export const MIN_ORDER_MESSAGE = `Minimum order total is ${peso(MIN_ORDER_TOTAL)}.`;

export const GUEST_MAX_ORDER_MESSAGE = `Guest orders have a maximum total of ${peso(
  GUEST_MAX_ORDER_TOTAL
)}. Sign up or log in to your customer account to place larger orders.`;

/** True when adding one more of an item would push a guest past the cap. */
export function wouldExceedGuestMax(currentTotal: number, unitPrice: number) {
  return currentTotal + unitPrice > GUEST_MAX_ORDER_TOTAL;
}
