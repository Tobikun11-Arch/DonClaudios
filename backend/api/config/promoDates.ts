/**
 * Promo date helpers.
 *
 * The owner picks promo dates with a date-only input ("2026-12-24"). Parsed
 * as-is that becomes UTC midnight, i.e. 8:00 AM in the Philippines, so a promo
 * "ending Dec 24" used to stop at 8 AM that day. Date-only values are pinned to
 * the store's day instead (UTC+8): start = 00:00, end = 23:59:59.999.
 */
const STORE_UTC_OFFSET = '+08:00';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parsePromoDate(value: unknown, edge: 'start' | 'end'): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value instanceof Date) return value;
  if (typeof value !== 'string') return new Date(value as number);
  if (DATE_ONLY.test(value)) {
    const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
    return new Date(`${value}T${time}${STORE_UTC_OFFSET}`);
  }
  return new Date(value);
}

/**
 * A product's own (embedded) promo is over: it was flagged active and its end
 * date has passed. Such products are hidden from customers and the counter.
 */
export function isEmbeddedPromoExpired(
  product: {isPromoActive?: boolean | null; promoEndDate?: Date | string | null},
  now: Date = new Date()
): boolean {
  if (product.isPromoActive !== true || !product.promoEndDate) return false;
  return new Date(product.promoEndDate).getTime() < now.getTime();
}
