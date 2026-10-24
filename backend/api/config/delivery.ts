/**
 * Delivery rules — SINGLE SOURCE OF TRUTH (backend).
 *
 * Mirrored by `frontend/lib/orders/deliveryMode.ts`. Keep both in sync.
 */

export const LECHON_CATEGORIES = [
  'Cochinillo',
  'Lechon Belly',
  'Lechon de Leche',
  'Traditional Lechon'
] as const;

export type LechonCategory = (typeof LECHON_CATEGORIES)[number];

export const FREE_DELIVERY_MIN_SUBTOTAL = 3000;

export const STORE_ADDRESS =
  'Jasmine St. De Roman Brgy. Daang Amaya 1, Tanza, Cavite, Philippines 4108';

export type DeliveryMode = 'DONCLAUDIO' | 'LALAMOVE';

const LECHON_CATEGORY_SET = new Set(
  LECHON_CATEGORIES.map(c => c.trim().toLowerCase())
);

export function isLechonCategory(category?: string | null): boolean {
  if (!category) return false;
  return LECHON_CATEGORY_SET.has(category.trim().toLowerCase());
}

export type DeliveryCartItem = {
  category?: string | null;
  price: number;
  quantity: number;
};

export function getDeliveryMode(
  items: DeliveryCartItem[]
): DeliveryMode {
  if (!items || items.length === 0) return 'LALAMOVE';

  const hasLechon = items.some(item => isLechonCategory(item.category));
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

  if (hasLechon || subtotal >= FREE_DELIVERY_MIN_SUBTOTAL) {
    return 'DONCLAUDIO';
  }
  return 'LALAMOVE';
}
