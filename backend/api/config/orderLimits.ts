// Order total limits for online orders. Keep identical to
// frontend/lib/constants/orderLimits.ts, which applies the same rules in the
// cart and at checkout. Walk-in (counter) orders placed by staff are not
// limited.
import {ApiError} from '../utils/error';

/** Smallest online order anyone (guest or customer) can place, in pesos. */
export const MIN_ORDER_TOTAL = 100;

/** Largest order a guest can place, in pesos. Customers have no maximum. */
export const GUEST_MAX_ORDER_TOTAL = 1000;

/**
 * Throws when a server-computed order total breaks the limits. Always pass the
 * total recomputed from server prices, never the client's `totalAmount`.
 */
export function assertOrderTotalWithinLimits(
  total: number,
  buyer: 'guest' | 'customer'
) {
  if (total < MIN_ORDER_TOTAL) {
    throw new ApiError(
      400,
      'ORDER_BELOW_MINIMUM',
      `Minimum order total is ₱${MIN_ORDER_TOTAL.toFixed(2)}.`
    );
  }
  if (buyer === 'guest' && total > GUEST_MAX_ORDER_TOTAL) {
    throw new ApiError(
      400,
      'GUEST_ORDER_LIMIT',
      `Guest orders have a maximum total of ₱${GUEST_MAX_ORDER_TOTAL.toLocaleString('en-PH')}.00. Sign up or log in to your customer account to place larger orders.`
    );
  }
}
