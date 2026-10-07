/**
 * The hardcoded "Featured" menu category.
 *
 * A curated view of what is happening right now: open pre-orders plus active
 * promo bundles. It is not backed by a Category row — the tab is synthesised
 * here so it always exists and cannot be renamed or deleted by the owner.
 *
 * Shown to signed-in customers only. Guests never receive pre-order products
 * from the API, so a Featured tab with holes in it would just be confusing.
 */

import {
  preOrderDisplay,
  isPreOrderProduct
} from '@/lib/preOrder/preOrder';
import {type Product} from '@/lib/types/product';
import {type Promo} from '@/lib/types/promo';

export const FEATURED_TAB_ID = 'featured';
export const FEATURED_TAB_LABEL = 'Featured';

/** Static art, since this tab has no Category record to pull an image from. */
export const FEATURED_TAB_IMAGE = '/assets/Highlights1.png';

/**
 * Cap so a long-running pre-order list cannot bury the rest of the menu.
 * The open window is what needs advertising; the tail is still reachable
 * through each item's own category tab.
 */
export const FEATURED_ITEM_LIMIT = 10;

export type FeaturedMenuItem = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  note?: string;
  href: string;
  isPreOrder: boolean;
  preOrderClosed: boolean;
  /** A batch window is open with stock left — the add button may be used. */
  preOrderOrderable: boolean;
  preOrderLimit: number | null;
  /** Purple status line: "Batch 1 live until 11:00 AM", "Pre-order closed"… */
  preOrderStatusLine: string;
  /** Gray second line: remaining stock and/or "Max N per customer". */
  preOrderSubLine: string;
};

/**
 * Build the Featured item list.
 *
 * @param products the products the viewer is allowed to see. Pre-orders are
 *   already absent for guests, but `isSignedIn` is checked too so the tab can
 *   never render for someone who must not see pre-orders.
 * @param promos active promos only (`GET /promos` already filters by date and
 *   isActive, so anything handed in here is live).
 * @param basePath route prefix for product and promo detail pages, e.g.
 *   `'order'` or `'customer/dashboard'`.
 */
export function buildFeaturedMenuItems(input: {
  products: Product[];
  promos: Promo[];
  isSignedIn: boolean;
  basePath: string;
}): FeaturedMenuItem[] {
  if (!input.isSignedIn) return [];

  const openPreOrders = input.products
    // A pre-order that is unavailable or out of stock is not "featured", and
    // one with no batch left today must not be advertised. Between batches it
    // stays visible so customers can see when the next window opens.
    .filter(p => {
      if (!isPreOrderProduct(p) || !p.isAvailable || p.stock <= 0) return false;
      return !preOrderDisplay(p).closed;
    })
    .map<FeaturedMenuItem>(p => {
      const display = preOrderDisplay(p);
      return {
        id: p._id,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        note: p.description,
        href: `/${input.basePath}/${encodeURIComponent(p._id)}`,
        isPreOrder: true,
        preOrderClosed: display.closed,
        preOrderOrderable: display.orderable,
        preOrderLimit:
          typeof p.preOrderPurchaseLimit === 'number' &&
          p.preOrderPurchaseLimit >= 1
            ? p.preOrderPurchaseLimit
            : null,
        preOrderStatusLine: display.statusLine,
        preOrderSubLine: display.subLine
      };
    });

  // Bundle promos only. Percentage and fixed-amount promos are discounts on
  // ordinary dishes, which already carry a badge on their own category tab —
  // listing them again here would just be noise.
  const bundles = input.promos
    .filter(
      (p): p is Promo & {price: number} =>
        p.promoType === 'bundle' && typeof p.price === 'number'
    )
    .map<FeaturedMenuItem>(p => ({
      id: p._id,
      name: p.title,
      price: p.price,
      imageUrl: p.imageUrl,
      note: p.description,
      href: `/${input.basePath}/promo/${encodeURIComponent(p._id)}`,
      isPreOrder: false,
      preOrderClosed: false,
      preOrderOrderable: true,
      preOrderLimit: null,
      preOrderStatusLine: '',
      preOrderSubLine: ''
    }));

  // Pre-orders lead: they are time-limited, so they are the reason to look.
  return [...openPreOrders, ...bundles].slice(0, FEATURED_ITEM_LIMIT);
}