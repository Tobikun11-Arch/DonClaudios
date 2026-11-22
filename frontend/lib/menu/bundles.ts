import type {Product, ProductAllergen, ServingUnit} from '@/lib/types/product';

/**
 * Promo-category products on the customer side. Mirrors the backend
 * (config/promoDates.ts, services/bundle.service.ts, orderPricing.service.ts).
 *
 * The owner adds promos as Products in the "Promo" category. Such a product
 * is a promo, not a menu section: it shows under the Promos chip only while
 * switched on and inside its dates. A "Bundle Deal" promo lists the products
 * it includes (`bundleItems`) and has no stock of its own: the server reports
 * how many its items' stock can make.
 */

export function isPromoCategory(category?: string | null): boolean {
  return typeof category === 'string' && /^promos?$/i.test(category.trim());
}

/** Switched on and inside its start/end dates (always true outside Promo). */
export function isPromoProductLive(
  product: Pick<Product, 'category' | 'isPromoActive' | 'promoStartDate' | 'promoEndDate'>,
  now: Date = new Date()
): boolean {
  if (!isPromoCategory(product.category)) return true;
  if (product.isPromoActive === false) return false;
  const t = now.getTime();
  if (product.promoStartDate && new Date(product.promoStartDate).getTime() > t) return false;
  if (product.promoEndDate && new Date(product.promoEndDate).getTime() < t) return false;
  return true;
}

/** A Promo-category product set up as a Bundle Deal with items inside. */
export function isBundleProduct(
  product: Pick<Product, 'category' | 'promoType' | 'bundleItems'> | null | undefined
): boolean {
  return (
    !!product &&
    isPromoCategory(product.category) &&
    product.promoType === 'bundle' &&
    Array.isArray(product.bundleItems) &&
    product.bundleItems.length > 0
  );
}

/**
 * A Promo item's own percentage / fixed discount applied to its price, rounded
 * to a whole peso like the server does. Null when it has no discount.
 * Ignores the dates: see `ownPromoPrice` for "charged right now".
 */
export function promoDiscountedPrice(
  product: Pick<Product, 'category' | 'price' | 'promoType' | 'discountRate' | 'discountAmount'>
): number | null {
  if (!isPromoCategory(product.category)) return null;
  let discounted: number | null = null;
  if (product.promoType === 'percentage' && typeof product.discountRate === 'number' && product.discountRate > 0) {
    discounted = product.price * (1 - product.discountRate / 100);
  }
  if (product.promoType === 'fixed_amount' && typeof product.discountAmount === 'number' && product.discountAmount > 0) {
    discounted = product.price - product.discountAmount;
  }
  if (discounted === null) return null;
  const safe = Math.max(0, Math.round(discounted));
  return safe >= product.price ? null : safe;
}

/** What the server charges for a Promo item right now (null = its price). */
export function ownPromoPrice(product: Product, now: Date = new Date()): number | null {
  return isPromoProductLive(product, now) ? promoDiscountedPrice(product) : null;
}

/** "20% OFF" / "₱50 OFF" for a Promo item with its own discount. */
export function ownPromoBadge(product: Pick<Product, 'category' | 'promoType' | 'discountRate' | 'discountAmount'>): string | null {
  if (!isPromoCategory(product.category)) return null;
  if (product.promoType === 'percentage' && product.discountRate) return `${product.discountRate}% OFF`;
  if (product.promoType === 'fixed_amount' && product.discountAmount) return `₱${product.discountAmount} OFF`;
  return null;
}

export type BundleSummary = {
  components: Array<{product: Product; qty: number}>;
  /** Items missing from the menu right now (deleted, hidden or unavailable). */
  missingCount: number;
  /** Sum of the items' regular prices. */
  originalTotal: number;
  /** originalTotal - bundle price, never below 0. */
  savings: number;
  /** Every allergen of every item, deduplicated. */
  allergens: ProductAllergen[];
  /** How many bundles the items' stock can make (0 = sold out). */
  maxOrderable: number;
  /** False when an item is missing or out of stock. */
  available: boolean;
};

/**
 * @param productsById the products the viewer can see. An item missing from
 *   it is off the menu, which makes the whole bundle unavailable.
 */
export function summarizeBundle(
  bundle: Pick<Product, 'bundleItems' | 'price'>,
  productsById: ReadonlyMap<string, Product>
): BundleSummary {
  const components: BundleSummary['components'] = [];
  let missingCount = 0;
  for (const line of bundle.bundleItems ?? []) {
    const product = productsById.get(String(line.productId));
    if (!product || product.isAvailable === false) missingCount += 1;
    else components.push({product, qty: line.qty});
  }

  const originalTotal = components.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  const allergens = Array.from(new Set(components.flatMap(c => c.product.allergens ?? [])));
  const maxOrderable =
    missingCount > 0 || components.length === 0
      ? 0
      : Math.min(...components.map(c => Math.floor((c.product.stock ?? 0) / c.qty)));

  return {
    components,
    missingCount,
    originalTotal,
    savings: missingCount > 0 ? 0 : Math.max(0, originalTotal - bundle.price),
    allergens,
    maxOrderable: Math.max(0, maxOrderable),
    available: maxOrderable > 0
  };
}

const SHORT_UNIT: Record<ServingUnit, string> = {
  pcs: 'pcs',
  slices: 'slices',
  cups: 'cups',
  g: 'g',
  ml: 'ml',
  kg: 'kg',
  pax: 'pax'
};

/** "6 pcs", "250 g", "Good for 4 pax". Null when the product has none. */
export function formatServing(qty?: number | null, unit?: ServingUnit | null): string | null {
  if (typeof qty !== 'number' || qty <= 0 || !unit) return null;
  const n = Number.isInteger(qty) ? String(qty) : String(Number(qty.toFixed(2)));
  if (unit === 'pax') return `Good for ${n} pax`;
  if (unit === 'pcs' && qty === 1) return '1 pc';
  return `${n} ${SHORT_UNIT[unit]}`;
}
