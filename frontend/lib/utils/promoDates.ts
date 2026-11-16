import type {Promo} from '@/lib/types/promo';

/**
 * A product's own promo (category "Promo" items with promo dates) is over.
 * The server already hides these from customers and the counter; this guards
 * tabs left open past the end date.
 */
export function isProductPromoExpired(
  product: {isPromoActive?: boolean; promoEndDate?: string},
  now: Date = new Date()
): boolean {
  if (product.isPromoActive !== true || !product.promoEndDate) return false;
  return new Date(product.promoEndDate).getTime() < now.getTime();
}

/** A promo record that is switched on and inside its start/end window right now. */
export function isPromoLive(promo: Pick<Promo, 'isActive' | 'startDate' | 'endDate'>, now: Date = new Date()) {
  if (!promo.isActive) return false;
  const t = now.getTime();
  return new Date(promo.startDate).getTime() <= t && t <= new Date(promo.endDate).getTime();
}
