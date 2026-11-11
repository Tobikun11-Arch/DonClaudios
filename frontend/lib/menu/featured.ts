/**
 * The hardcoded "Featured" menu tab: the menu's default view. It is not
 * backed by a Category row, so it always exists and cannot be renamed or
 * deleted by the owner. Its sections (pre-orders, best sellers, order again,
 * promos and bundles) are built in `features/menu/menuItems.ts`.
 */

export const FEATURED_TAB_ID = 'featured';
export const FEATURED_TAB_LABEL = 'Featured';

/** Static art, since this tab has no Category record to pull an image from. */
export const FEATURED_TAB_IMAGE = '/assets/Highlights1.png';

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
  /** Server-computed daily allowance for the signed-in customer (null = guest). */
  preOrderAllowance: number | null;
  /** Units this customer already committed to this pre-order today. */
  preOrderOrderedToday: number;
  /** Purple status line: "Batch 1 live until 11:00 AM", "Pre-order closed"… */
  preOrderStatusLine: string;
  /** Gray second line: remaining stock and/or "Max N per customer". */
  preOrderSubLine: string;
};
