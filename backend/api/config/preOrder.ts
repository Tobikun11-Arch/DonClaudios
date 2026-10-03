/**
 * Pre-order rules — SINGLE SOURCE OF TRUTH (backend).
 *
 * Mirrored for the UI by `frontend/lib/preOrder/preOrder.ts`. Keep both in
 * sync: the backend copy is the one that enforces, the frontend copy only
 * decides which fields to show.
 *
 * A pre-order product:
 *   - lives in one of PRE_ORDER_CATEGORIES only
 *   - is hidden from guests entirely (server-side filtering)
 *   - has an owner-set purchase limit (whole number >= 1)
 *   - has an owner-set deadline; the WHOLE last day is still orderable
 */

/**
 * The only categories that may be turned into a pre-order.
 * Matching is case- and whitespace-insensitive.
 */
export const PRE_ORDER_CATEGORIES = [
  'Cochinillo',
  'Lechon de Leche',
  'Lechon Belly',
  'Traditional Lechon'
] as const;

export type PreOrderCategory = (typeof PRE_ORDER_CATEGORIES)[number];

/** The store is in Cebu, Philippines (UTC+8, no DST). */
export const PRE_ORDER_TZ_OFFSET_MINUTES = 480;

/** Normalised lookup set so ' lechon belly ' === 'Lechon Belly'. */
const PRE_ORDER_CATEGORY_SET = new Set(
  PRE_ORDER_CATEGORIES.map(c => c.trim().toLowerCase())
);

/** Is this category allowed to be a pre-order? */
export function isPreOrderCategory(category?: string | null): boolean {
  if (!category) return false;
  return PRE_ORDER_CATEGORY_SET.has(category.trim().toLowerCase());
}

/* ------------------------------------------------------------------ *
 * DEADLINE
 * ------------------------------------------------------------------ */

/**
 * Today's calendar date in the store's timezone, as YYYY-MM-DD.
 * Used as the `min` bound so the owner cannot pick a past day.
 */
export function todayInStoreTimezone(now: Date = new Date()): string {
  const shifted = new Date(
    now.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  );
  return shifted.toISOString().slice(0, 10);
}

/**
 * Turn an owner's picked date into the instant pre-orders close.
 *
 * The deadline is INCLUSIVE of the whole chosen day: picking 2026-10-20
 * closes at 2026-10-20 23:59:59.999 Philippine time, so a customer can
 * still order late on the 20th.
 *
 * Returns null for anything unparseable so callers can reject it.
 */
export function preOrderDeadlineToInstant(
  dateString: string
): Date | null {
  const trimmed = (dateString ?? '').trim();
  // Expect YYYY-MM-DD from <input type="date">.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // End of that local day in UTC+8, expressed as a UTC instant.
  const utcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) -
    PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000;
  const instant = new Date(utcMs);

  // Reject impossible calendar dates like 2026-02-31 (which JS would roll over).
  if (
    instant.getUTCFullYear() !== year ||
    instant.getUTCMonth() !== month - 1 ||
    instant.getUTCDate() !== day
  ) {
    // Date.UTC rolls 23:59:59.999 forward into the next day for overflow days.
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
  }

  return instant;
}

/** Has the pre-order window closed? A null/missing deadline is NOT closed. */
export function isPreOrderClosed(
  deadline: Date | string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!deadline) return false;
  const instant = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(instant.getTime())) return false;
  return now.getTime() > instant.getTime();
}

/**
 * Short, human deadline for copy we generate (notifications, not the UI),
 * e.g. "Oct 20". Uses English month abbreviations in the store's timezone so it
 * matches what the customer sees on the menu card.
 */
export function formatPreOrderDeadlineShort(
  deadline: Date | string | null | undefined
): string {
  if (!deadline) return '';
  const instant = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(instant.getTime())) return '';

  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const shifted = new Date(
    instant.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  );
  return `${MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCDate()}`;
}

/* ------------------------------------------------------------------ *
 * VALIDATION HELPERS
 * ------------------------------------------------------------------ */

/**
 * A pre-order must be: an eligible category, a whole-number limit >= 1, and a
 * deadline that is today or later. Used by the DTO/service so a bad payload
 * can never reach the database.
 */
export function validatePreOrderFields(input: {
  category?: string | null;
  isPreOrder?: boolean | null;
  purchaseLimit?: number | null | undefined;
  deadline?: Date | null;
  today?: string;
  /**
   * Skip the past-date rule. Used when re-saving a product whose deadline has
   * already passed and the owner did not pick a new date — the existing
   * pre-order is closed anyway, but blocking the edit would be wrong.
   */
  allowPastDeadline?: boolean;
}): {ok: true} | {ok: false; message: string} {
  if (!input.isPreOrder) return {ok: true};

  if (!isPreOrderCategory(input.category)) {
    return {
      ok: false,
      message: `Pre-order is only available for: ${PRE_ORDER_CATEGORIES.join(', ')}.`
    };
  }

  const limit = input.purchaseLimit;
  if (typeof limit !== 'number' || !Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
    return {
      ok: false,
      message: 'Purchase limit must be a whole number greater than zero.'
    };
  }

  if (!input.deadline) {
    return {ok: false, message: 'Pre-order deadline is required.'};
  }

  const deadline = input.deadline instanceof Date ? input.deadline : new Date(input.deadline);
  if (Number.isNaN(deadline.getTime())) {
    return {ok: false, message: 'Pre-order deadline is not a valid date.'};
  }

  // Compare calendar days in the store's timezone, so "today" is allowed
  // (the whole day is still orderable) but yesterday is not.
  const today = input.today ?? todayInStoreTimezone();
  const deadlineDay = new Date(
    deadline.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
  if (deadlineDay < today && input.allowPastDeadline !== true) {
    return {
      ok: false,
      message: 'Pre-order deadline cannot be in the past.'
    };
  }

  return {ok: true};
}