/**
 * Pre-order helpers for the UI.
 *
 * The authoritative rules live in `backend/api/config/preOrder.ts` and are
 * enforced server-side. This file only decides which fields to show, what
 * copy to render, and how to keep the customer-facing UX honest. Keep the
 * category list in sync with the backend.
 */

export const PRE_ORDER_CATEGORIES = [
  'Cochinillo',
  'Lechon de Leche',
  'Lechon Belly',
  'Traditional Lechon'
] as const;

const PRE_ORDER_CATEGORY_SET = new Set(
  PRE_ORDER_CATEGORIES.map(c => c.trim().toLowerCase())
);

/** Does this category support pre-order at all? */
export function isPreOrderCategory(category?: string | null): boolean {
  if (!category) return false;
  return PRE_ORDER_CATEGORY_SET.has(category.trim().toLowerCase());
}

/** The store is in Cebu, Philippines (UTC+8, no DST). */
export const PRE_ORDER_TZ_OFFSET_MINUTES = 480;

export type PreOrderProduct = {
  isPreOrder?: boolean | null;
  preOrderPurchaseLimit?: number | null;
  preOrderDeadline?: string | null;
};

/** Is this product actually a pre-order? */
export function isPreOrderProduct(p?: PreOrderProduct | null): boolean {
  return p?.isPreOrder === true;
}

/** Today's date in the store's timezone, as YYYY-MM-DD (for the date input `min`). */
export function todayInStoreTimezone(now: Date = new Date()): string {
  const shifted = new Date(
    now.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  );
  return shifted.toISOString().slice(0, 10);
}

/** The calendar day (YYYY-MM-DD, store time) a deadline falls on. */
function deadlineDay(deadline?: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    d.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
}

/** Has the pre-order window closed? */
export function isPreOrderClosed(
  p?: PreOrderProduct | null,
  now: Date = new Date()
): boolean {
  if (!isPreOrderProduct(p) || !p?.preOrderDeadline) return false;
  const d = new Date(p.preOrderDeadline);
  if (Number.isNaN(d.getTime())) return false;
  return now.getTime() > d.getTime();
}

/**
 * Turn a stored deadline instant back into the YYYY-MM-DD the date input
 * expects, in the store's timezone. Used when loading a product into the
 * owner form so editing shows the day the owner originally picked.
 */
export function toDeadlineInputValue(
  deadline?: string | null
): string {
  return deadlineDay(deadline) ?? '';
}

/** e.g. "Oct 20" — the day pre-orders close, in the customer's locale. */
export function formatPreOrderDeadline(p?: PreOrderProduct | null): string {
  const day = deadlineDay(p?.preOrderDeadline);
  if (!day) return '';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

/** e.g. "Pre-order until Oct 20" */
export function preOrderDeadlineLabel(p?: PreOrderProduct | null): string {
  const day = formatPreOrderDeadline(p);
  return day ? `Pre-order until ${day}` : 'Pre-order';
}

/** e.g. "Max 2 per customer" */
export function preOrderLimitLabel(p?: PreOrderProduct | null): string {
  const limit = p?.preOrderPurchaseLimit;
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 1) {
    return '';
  }
  return `Max ${limit} per customer`;
}

/**
 * Friendly, specific message when a customer tries to exceed the limit.
 * `currentQty` is what is already in the cart.
 */
export function preOrderLimitMessage(input: {
  productName: string;
  limit: number;
  currentQty: number;
}): string {
  const remaining = Math.max(0, input.limit - input.currentQty);
  if (remaining <= 0) {
    return `${input.productName} is limited to ${input.limit} per customer.`;
  }
  return `${input.productName} is limited to ${input.limit} per customer. You can add ${remaining} more.`;
}

/** Friendly message when the deadline has already passed. */
export function preOrderClosedMessage(productName: string): string {
  return `Pre-orders for ${productName} have closed.`;
}