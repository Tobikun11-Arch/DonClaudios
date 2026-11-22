import type {Product, ProductAllergen} from '@/lib/types/product';
import type {Promo} from '@/lib/types/promo';
import type {Category} from '@/lib/types/category';
import {
  formatServing,
  isBundleProduct,
  isPromoCategory,
  isPromoProductLive,
  ownPromoBadge,
  ownPromoPrice,
  summarizeBundle
} from '@/lib/menu/bundles';
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
import {getDiscountedUnitPrice} from '@/lib/utils/promoPricing';

export {FEATURED_TAB_ID};

/** One card on the customer-facing menu (a product or a Bundle Deal). */
export type MenuItem = FeaturedMenuItem & {
  kind: 'product' | 'bundle';
  category: string | null;
  allergens: ProductAllergen[];
  /** Units left (for a bundle: how many its items' stock can make). */
  stock: number | null;
  /**
   * What the cart is given: the price after a Promo item's own discount.
   * `displayPrice` may go lower through a promo record (legacy Promos page).
   */
  displayPrice: number;
  /** Struck-through regular price, or what a bundle's items cost one by one. */
  wasPrice: number | null;
  badge: string | null;
  /** "6 pcs", "Good for 4 pax"... (products only). */
  serving: string | null;
  /** Bundles: how many items one bundle holds (sum of quantities). */
  bundleItemCount: number | null;
  /** Bundles: the items' regular total minus the bundle price. */
  bundleSavings: number | null;
  /** Bundles only: an item inside is out of stock or off the menu. */
  soldOut: boolean;
};

export type MenuTab = {
  id: string;
  label: string;
  /** Category name for product tabs; null for Featured / Promos. */
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

const NOT_PRE_ORDER = {
  isPreOrder: false,
  preOrderClosed: false,
  preOrderOrderable: true,
  preOrderLimit: null,
  preOrderAllowance: null,
  preOrderOrderedToday: 0,
  preOrderStatusLine: '',
  preOrderSubLine: ''
} as const;

export function productToMenuItem(
  product: Product,
  promos: Promo[],
  basePath: string
): MenuItem {
  const display = preOrderDisplay(product);
  // A Promo item's own discount is the price customers pay (the server
  // charges the same); a promo record can still take it lower.
  const ownPrice = ownPromoPrice(product);
  const price = ownPrice ?? product.price;
  // Same rule as the server: an own discount wins over any promo record.
  const {unitPrice, badge} =
    ownPrice != null
      ? {unitPrice: price, badge: null}
      : getDiscountedUnitPrice({promos, productId: product._id, basePrice: price});
  return {
    kind: 'product',
    id: product._id,
    name: product.name,
    price,
    displayPrice: unitPrice,
    wasPrice: unitPrice < product.price ? product.price : null,
    badge:
      (ownPrice != null ? ownPromoBadge(product) : null) ??
      badge?.label ??
      (isPromoCategory(product.category) ? 'PROMO' : null),
    imageUrl: product.imageUrl,
    note: product.description,
    href: `/${basePath}/${encodeURIComponent(product._id)}`,
    category: product.category ?? null,
    allergens: product.allergens ?? [],
    stock: product.stock,
    serving: formatServing(product.servingQty, product.servingUnit),
    bundleItemCount: null,
    bundleSavings: null,
    soldOut: false,
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
  bundle: Product,
  basePath: string,
  productsById: ReadonlyMap<string, Product>
): MenuItem {
  const summary = summarizeBundle(bundle, productsById);
  return {
    kind: 'bundle',
    id: bundle._id,
    name: bundle.name,
    price: bundle.price,
    displayPrice: bundle.price,
    wasPrice: summary.savings > 0 ? summary.originalTotal : null,
    badge: 'BUNDLE',
    imageUrl: bundle.imageUrl,
    note: bundle.description,
    href: `/${basePath}/promo/${encodeURIComponent(bundle._id)}`,
    category: bundle.category ?? null,
    // Everything inside the bundle, so a Lechon + Nachos bundle never looks
    // allergen-free.
    allergens: summary.allergens,
    stock: summary.maxOrderable,
    serving: null,
    bundleItemCount: summary.components.reduce((n, c) => n + c.qty, 0),
    bundleSavings: summary.savings > 0 ? summary.savings : null,
    soldOut: !summary.available,
    ...NOT_PRE_ORDER
  };
}

export type MenuSection = {id: string; label: string; items: MenuItem[]};

/** How many cards each Featured section shows at most. */
const FEATURED_SECTION_LIMIT = 6;

export const PROMOS_TAB_ID = 'promos';

/** Add-ons always close the menu, whatever the owner's order says. */
const ADD_ONS_CATEGORY = /^add[\s-]?ons?$/i;

/** Top-bar chips used until the owner pins categories in Settings. */
const DEFAULT_TOP_BAR = ['rice meals', 'appetizers', 'drinks', 'add-ons'];

/**
 * Everything the menu shows.
 *
 * Top bar, in order (`tabs`):
 * - Featured (the default): best sellers of the last 30 days. Hidden when none.
 * - Promos: the owner's Promo items (Bundle Deals first) that are switched on
 *   and inside their dates, plus other discounted items. Hidden when empty.
 *   "Promo" itself is never a category tab.
 * - The categories the owner pinned ("Show in top bar"), in menu order.
 *
 * `allTabs` is the same plus every other category, for the Categories panel
 * (the only way to reach a category that is not pinned).
 * Menu order is the owner's `sortOrder` (Settings > Menu categories), with
 * Add-ons always last.
 */
export function buildMenu(input: {
  products: Product[];
  promos: Promo[];
  basePath: string;
  /** Category records (order, top-bar flag, photo). */
  categories: Category[];
  /** Ranked ids from the server; ids not on the menu right now are skipped. */
  bestSellerIds: string[];
}): {
  tabs: MenuTab[];
  allTabs: MenuTab[];
  featuredSections: MenuSection[];
  categorySections: MenuSection[];
} {
  const {products, promos, basePath, categories: categoryRecords} = input;
  const keyOf = (name: string) => name.trim().toLowerCase();
  const recordByName = new Map(categoryRecords.map(c => [keyOf(c.name), c]));
  const imageOf = (name: string) => recordByName.get(keyOf(name))?.imageUrl ?? undefined;
  const now = new Date();

  // Promo items only while switched on and inside their dates.
  const visible = products.filter(p => isPromoProductLive(p, now));
  const productsById = new Map(products.map(p => [p._id, p]));
  const bundles = visible.filter(isBundleProduct).map(p => bundleToMenuItem(p, basePath, productsById));
  const productItems = visible
    .filter(p => !isBundleProduct(p))
    .map(p => productToMenuItem(p, promos, basePath));

  const productItemById = new Map(productItems.map(i => [i.id, i]));
  // Pre-orders are sold through the Holiday Pre-orders strip and their own
  // category, so they never fill Featured or Promos.
  const bestSellers = input.bestSellerIds
    .map(id => productItemById.get(id))
    .filter((i): i is MenuItem => !!i && !i.isPreOrder)
    .slice(0, FEATURED_SECTION_LIMIT);

  const featuredSections: MenuSection[] = [
    {id: 'best-sellers', label: 'Best sellers', items: bestSellers}
  ];

  // Menu order: the owner's sortOrder, then categories without a record A-Z,
  // Add-ons last. The Promo category is not a section of its own.
  const rank = (name: string) => {
    if (ADD_ONS_CATEGORY.test(name.trim())) return Number.MAX_SAFE_INTEGER;
    const record = recordByName.get(keyOf(name));
    return record ? record.sortOrder : Number.MAX_SAFE_INTEGER - 1;
  };
  const ordered = Array.from(
    new Set(
      productItems
        .map(i => i.category)
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0 && !isPromoCategory(c))
    )
  ).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  const promoItems = [
    ...bundles,
    ...productItems.filter(
      i => !i.isPreOrder && (isPromoCategory(i.category) || i.displayPrice < i.price)
    )
  ];

  const categoryTab = (category: string): MenuTab => ({
    id: tabIdFor(category),
    label: category,
    category,
    imageUrl: imageOf(category)
  });

  // Pinned categories; until the owner pins any, use the agreed default set.
  const anyPinned = categoryRecords.some(c => c.showInTopBar && !isPromoCategory(c.name));
  const pinned = ordered.filter(c =>
    anyPinned ? recordByName.get(keyOf(c))?.showInTopBar === true : DEFAULT_TOP_BAR.includes(keyOf(c))
  );

  const promoRecord = categoryRecords.find(c => isPromoCategory(c.name));
  const builtIn: MenuTab[] = [
    ...(bestSellers.length > 0
      ? [{id: FEATURED_TAB_ID, label: FEATURED_TAB_LABEL, category: null, imageUrl: FEATURED_TAB_IMAGE}]
      : []),
    ...(promoItems.length > 0
      ? [{id: PROMOS_TAB_ID, label: 'Promos', category: null, imageUrl: promoRecord?.imageUrl ?? undefined}]
      : [])
  ];

  const tabs: MenuTab[] = [...builtIn, ...pinned.map(categoryTab)];
  const allTabs: MenuTab[] = [...builtIn, ...ordered.map(categoryTab)];

  const categorySections: MenuSection[] = [
    {id: PROMOS_TAB_ID, label: 'Promos', items: promoItems},
    ...ordered.map(category => ({
      id: tabIdFor(category),
      label: category,
      items: productItems.filter(i => i.category === category)
    }))
  ];

  return {tabs, allTabs, featuredSections, categorySections};
}

export function filterMenuItems(
  items: MenuItem[],
  opts: {query: string; excludedAllergens: ReadonlySet<ProductAllergen>; sort: MenuSort}
): MenuItem[] {
  const q = opts.query.trim().toLowerCase();
  const filtered = items.filter(item => {
    if (q && !item.name.toLowerCase().includes(q) && !(item.note ?? '').toLowerCase().includes(q)) return false;
    if (opts.excludedAllergens.size > 0 && item.allergens.some(a => opts.excludedAllergens.has(a))) {
      return false;
    }
    return true;
  });
  if (opts.sort === 'price-asc') filtered.sort((a, b) => a.displayPrice - b.displayPrice);
  if (opts.sort === 'price-desc') filtered.sort((a, b) => b.displayPrice - a.displayPrice);
  return filtered;
}
