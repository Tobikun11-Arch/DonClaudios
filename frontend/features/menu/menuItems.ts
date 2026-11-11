import type {Product, ProductAllergen} from '@/lib/types/product';
import type {Promo} from '@/lib/types/promo';
import {
  isPreOrderProduct,
  preOrderDisplay,
  preOrderRemainingAllowance
} from '@/lib/preOrder/preOrder';
import {
  FEATURED_TAB_ID,
  FEATURED_TAB_IMAGE,
  FEATURED_TAB_LABEL,
  type FeaturedMenuItem
} from '@/lib/menu/featured';
import {getBundleBadge, getDiscountedUnitPrice} from '@/lib/utils/promoPricing';

export {FEATURED_TAB_ID};

/** One card on the customer-facing menu (a product or a promo bundle). */
export type MenuItem = FeaturedMenuItem & {
  kind: 'product' | 'bundle';
  category: string | null;
  allergens: ProductAllergen[];
  /** null for bundles, which have no stock of their own. */
  stock: number | null;
  /** Price after any active percentage/fixed promo. `price` stays the base. */
  displayPrice: number;
  badge: string | null;
};

export type MenuTab = {
  id: string;
  label: string;
  /** Category name for product tabs; null for Featured. */
  category: string | null;
  imageUrl?: string;
};

export type MenuSort = 'recommended' | 'price-asc' | 'price-desc';

export function formatMenuPrice(n: number): string {
  return `₱${n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function tabIdFor(category: string) {
  return category.toLowerCase().replace(/\s+/g, '');
}

export function productToMenuItem(
  product: Product,
  promos: Promo[],
  basePath: string
): MenuItem {
  const display = preOrderDisplay(product);
  const {unitPrice, badge} = getDiscountedUnitPrice({
    promos,
    productId: product._id,
    basePrice: product.price
  });
  return {
    kind: 'product',
    id: product._id,
    name: product.name,
    price: product.price,
    displayPrice: unitPrice,
    badge: badge?.label ?? null,
    imageUrl: product.imageUrl,
    note: product.description,
    href: `/${basePath}/${encodeURIComponent(product._id)}`,
    category: product.category ?? null,
    allergens: product.allergens ?? [],
    stock: product.stock,
    isPreOrder: isPreOrderProduct(product),
    preOrderClosed: display.closed,
    preOrderOrderable: display.orderable,
    preOrderLimit:
      typeof product.preOrderPurchaseLimit === 'number' &&
      product.preOrderPurchaseLimit >= 1
        ? product.preOrderPurchaseLimit
        : null,
    preOrderAllowance: preOrderRemainingAllowance(product),
    preOrderOrderedToday:
      typeof product.preOrderOrderedToday === 'number'
        ? product.preOrderOrderedToday
        : 0,
    preOrderStatusLine: display.statusLine,
    preOrderSubLine: display.subLine
  };
}

function bundleToMenuItem(
  promo: Promo & {price: number},
  basePath: string
): MenuItem {
  return {
    kind: 'bundle',
    id: promo._id,
    name: promo.title,
    price: promo.price,
    displayPrice: promo.price,
    badge: getBundleBadge()?.label ?? 'BUNDLE',
    imageUrl: promo.imageUrl,
    note: promo.description,
    href: `/${basePath}/promo/${encodeURIComponent(promo._id)}`,
    category: null,
    allergens: [],
    stock: null,
    // Bundles are never pre-orders.
    isPreOrder: false,
    preOrderClosed: false,
    preOrderOrderable: true,
    preOrderLimit: null,
    preOrderAllowance: null,
    preOrderOrderedToday: 0,
    preOrderStatusLine: '',
    preOrderSubLine: ''
  };
}

export type MenuSection = {id: string; label: string; items: MenuItem[]};

/** How many cards each Featured section shows at most. */
const FEATURED_SECTION_LIMIT = 6;

export const PROMOS_TAB_ID = 'promos';

/** An owner-made category such as "Promo" is folded into the Promos chip. */
const PROMO_CATEGORY = /^promos?$/i;

/**
 * Everything the menu shows.
 *
 * Tabs, in order:
 * - Featured (the default): best sellers only. Hidden when there are none.
 * - Promos: discounted items, bundle deals, and anything in an owner-made
 *   "Promo" category. Hidden when empty.
 * - The rice category, then the other categories A–Z.
 */
export function buildMenu(input: {
  products: Product[];
  promos: Promo[];
  basePath: string;
  categoryImages: Record<string, string | undefined>;
  /** Ranked ids from the server; ids not on the menu right now are skipped. */
  bestSellerIds: string[];
}): {tabs: MenuTab[]; featuredSections: MenuSection[]; categorySections: MenuSection[]} {
  const {products, promos, basePath, categoryImages} = input;

  const productItems = products.map(p => productToMenuItem(p, promos, basePath));
  // Items in the owner's "Promo" category carry no discount of their own, so
  // tag them on the card wherever they show (Featured, Promos, search).
  const promoCategoryName = products
    .map(p => p.category)
    .find(c => typeof c === 'string' && PROMO_CATEGORY.test(c));
  for (const item of productItems) {
    if (!item.badge && promoCategoryName && item.category === promoCategoryName) item.badge = 'PROMO';
  }
  const productItemById = new Map(productItems.map(i => [i.id, i]));
  const bestSellers = input.bestSellerIds
    .map(id => productItemById.get(id))
    .filter((i): i is MenuItem => !!i)
    .slice(0, FEATURED_SECTION_LIMIT);

  const bundles = promos
    .filter(
      (p): p is Promo & {price: number} =>
        p.promoType === 'bundle' && typeof p.price === 'number'
    )
    .map(p => bundleToMenuItem(p, basePath));

  const featuredSections: MenuSection[] = [
    {id: 'best-sellers', label: 'Best sellers', items: bestSellers}
  ];

  const categories = Array.from(
    new Set(
      products
        .map(p => p.category)
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  const promoCategory = categories.find(c => PROMO_CATEGORY.test(c)) ?? null;
  const rest = categories.filter(c => c !== promoCategory);
  const rice = rest.find(c => /rice/i.test(c)) ?? null;
  const ordered = rice ? [rice, ...rest.filter(c => c !== rice)] : rest;

  const promoItems = [
    ...productItems.filter(
      i => i.displayPrice < i.price || (promoCategory !== null && i.category === promoCategory)
    ),
    ...bundles
  ];

  const tabs: MenuTab[] = [
    ...(bestSellers.length > 0
      ? [{id: FEATURED_TAB_ID, label: FEATURED_TAB_LABEL, category: null, imageUrl: FEATURED_TAB_IMAGE}]
      : []),
    ...(promoItems.length > 0
      ? [{
          id: PROMOS_TAB_ID,
          label: 'Promos',
          category: null,
          imageUrl: promoCategory ? categoryImages[promoCategory] : undefined
        }]
      : []),
    ...ordered.map(category => ({
      id: tabIdFor(category),
      label: category,
      category,
      imageUrl: categoryImages[category]
    }))
  ];

  const categorySections: MenuSection[] = [
    {id: PROMOS_TAB_ID, label: 'Promos', items: promoItems},
    ...ordered.map(category => ({
      id: tabIdFor(category),
      label: category,
      items: productItems.filter(i => i.category === category)
    }))
  ];

  return {tabs, featuredSections, categorySections};
}

export function filterMenuItems(
  items: MenuItem[],
  opts: {query: string; excludedAllergens: ReadonlySet<ProductAllergen>; sort: MenuSort}
): MenuItem[] {
  const q = opts.query.trim().toLowerCase();
  const filtered = items.filter(item => {
    if (q && !item.name.toLowerCase().includes(q)) return false;
    if (opts.excludedAllergens.size > 0 && item.allergens.some(a => opts.excludedAllergens.has(a))) {
      return false;
    }
    return true;
  });
  if (opts.sort === 'price-asc') filtered.sort((a, b) => a.displayPrice - b.displayPrice);
  if (opts.sort === 'price-desc') filtered.sort((a, b) => b.displayPrice - a.displayPrice);
  return filtered;
}
