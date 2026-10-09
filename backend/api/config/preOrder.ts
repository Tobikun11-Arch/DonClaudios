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
 *   - has an owner-set purchase limit per customer per pre-order day
 *     (whole number >= 1); all batches of the day share that allowance
 *   - has an owner-set day; within that day it is split into one or more
 *     batches, each with its own time window and stock. A batch only accepts
 *     orders while its window is live — first come, first served.
 *   - products saved before batches existed fall back to "orderable all day"
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

/**
 * The store-local calendar day (YYYY-MM-DD, UTC+8) a deadline falls on.
 * Returns null when there is no usable deadline.
 *
 * This is the "pre-order day": all batches run inside it and the
 * per-customer purchase limit is scoped to it.
 */
export function preOrderDayKey(
  deadline?: Date | string | null
): string | null {
  if (!deadline) return null;
  const instant = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(instant.getTime())) return null;
  return new Date(
    instant.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * Half-open instant range [from, to) covering the store-local day a deadline
 * falls on. Every order placed for this pre-order edition falls inside it, so
 * it is the window the per-customer allowance is counted over.
 */
export function preOrderDayWindow(
  deadline?: Date | string | null
): {from: Date; to: Date} | null {
  const key = preOrderDayKey(deadline);
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  const from = new Date(
    Date.UTC(y, m - 1, d, 0, 0, 0, 0) -
      PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  );
  return {from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000)};
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

/* ------------------------------------------------------------------ *
 * BATCHES
 * ------------------------------------------------------------------ */

/** Shape the client may send (no `sold` — that is server-maintained). */
export type PreOrderBatchInput = {
  startTime: string;
  endTime: string;
  stock: number;
};

/** Shape stored on the product document. */
export type PreOrderBatchStored = PreOrderBatchInput & {sold: number};

export type PreOrderBatchStatus = 'upcoming' | 'live' | 'sold_out' | 'ended';

export type PreOrderBatchState = PreOrderBatchStored & {
  index: number;
  /** Window open instant (store timezone). */
  start: Date | null;
  /** Window close instant (store timezone). */
  end: Date | null;
  status: PreOrderBatchStatus;
  remaining: number;
};

export type PreOrderState = {
  /** False for legacy pre-orders saved before batches existed. */
  hasBatches: boolean;
  batches: PreOrderBatchState[];
  /** The batch whose window is open right now with stock left, if any. */
  liveBatch: PreOrderBatchState | null;
  /** The earliest not-yet-started batch with stock left, if any. */
  nextBatch: PreOrderBatchState | null;
  /** May an order be placed right now? */
  orderable: boolean;
  /** Every batch is over or sold out (or the day itself has passed). */
  allDone: boolean;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Is this a valid 24h wall-clock time ("08:00", "23:59")? */
export function isValidBatchTime(value?: string | null): boolean {
  return typeof value === 'string' && TIME_PATTERN.test(value.trim());
}

/** "08:30" -> 510. Returns null for anything unparseable. */
export function batchTimeToMinutes(value: string): number | null {
  if (!isValidBatchTime(value)) return null;
  const [h, m] = value.trim().split(':').map(Number);
  return h * 60 + m;
}

/** Store-local "HH:MM" -> UTC instant on the day the deadline falls on. */
function timeOnDeadlineDay(deadline: Date, time: string): Date | null {
  const day = new Date(
    deadline.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
  const minutes = batchTimeToMinutes(time);
  if (minutes === null) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(
    Date.UTC(y, m - 1, d, 0, minutes) -
      PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  );
}

/** e.g. "3:00 PM" — for customer-facing/limit error copy. */
export function formatBatchTime(time: string): string {
  const minutes = batchTimeToMinutes(time);
  if (minutes === null) return time;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Derive every batch's window and status from the stored data plus the clock.
 *
 * Status priority: window over -> ended; no stock left -> sold_out;
 * window not open yet -> upcoming; otherwise live.
 */
export function getPreOrderState(
  product: {
    isPreOrder?: boolean | null;
    preOrderDeadline?: Date | string | null;
    preOrderBatches?: PreOrderBatchStored[] | null;
  },
  now: Date = new Date()
): PreOrderState {
  const empty: PreOrderState = {
    hasBatches: false,
    batches: [],
    liveBatch: null,
    nextBatch: null,
    orderable: false,
    allDone: false
  };

  if (product.isPreOrder !== true) return empty;

  const deadline =
    product.preOrderDeadline instanceof Date
      ? product.preOrderDeadline
      : product.preOrderDeadline
        ? new Date(product.preOrderDeadline)
        : null;
  const hasDeadline = deadline !== null && !Number.isNaN(deadline.getTime());

  const raw = product.preOrderBatches ?? [];
  if (raw.length === 0) {
    // Legacy product: orderable all day, until the deadline passes.
    const closed = !hasDeadline || isPreOrderClosed(deadline, now);
    return {...empty, orderable: !closed, allDone: closed};
  }

  const batches: PreOrderBatchState[] = raw.map((b, index) => {
    const start = hasDeadline ? timeOnDeadlineDay(deadline, b.startTime) : null;
    const end = hasDeadline ? timeOnDeadlineDay(deadline, b.endTime) : null;
    const remaining = Math.max(0, b.stock - b.sold);

    let status: PreOrderBatchStatus;
    if (!start || !end || now.getTime() >= end.getTime()) {
      status = 'ended';
    } else if (remaining <= 0) {
      status = 'sold_out';
    } else if (now.getTime() < start.getTime()) {
      status = 'upcoming';
    } else {
      status = 'live';
    }

    return {
      ...b,
      index,
      start,
      end,
      status,
      remaining
    };
  });

  const liveBatch = batches.find(b => b.status === 'live') ?? null;
  // Earliest upcoming, regardless of the order the owner entered them.
  const nextBatch =
    batches
      .filter(b => b.status === 'upcoming')
      .sort(
        (a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0)
      )[0] ?? null;

  return {
    hasBatches: true,
    batches,
    liveBatch,
    nextBatch,
    orderable: liveBatch !== null,
    allDone: liveBatch === null && nextBatch === null
  };
}

/**
 * Structural rules for the batches the owner submitted. Returns the list
 * normalised in time order, or a message to reject the payload with.
 *
 * Batches are optional overall (legacy products have none), so this is only
 * called when the payload actually carries them.
 */
export function validatePreOrderBatches(
  batches: PreOrderBatchInput[] | null | undefined
): {ok: true; batches: PreOrderBatchInput[]} | {ok: false; message: string} {
  if (batches == null) return {ok: true, batches: []};
  if (!Array.isArray(batches) || batches.length === 0) {
    return {
      ok: false,
      message: 'Add at least one pre-order batch with a time window and stock.'
    };
  }
  if (batches.length > 7) {
    return {ok: false, message: 'A pre-order day can have at most 7 batches.'};
  }

  for (const batch of batches) {
    if (!isValidBatchTime(batch.startTime) || !isValidBatchTime(batch.endTime)) {
      return {
        ok: false,
        message: 'Each batch needs a valid start and end time (HH:MM).'
      };
    }
    const start = batchTimeToMinutes(batch.startTime) as number;
    const end = batchTimeToMinutes(batch.endTime) as number;
    if (end <= start) {
      return {
        ok: false,
        message: `Batch ${formatBatchTime(batch.startTime)}–${formatBatchTime(batch.endTime)} must end after it starts.`
      };
    }
    if (!Number.isInteger(batch.stock) || batch.stock < 1) {
      return {
        ok: false,
        message: 'Each batch needs a whole-number stock of at least 1.'
      };
    }
  }

  const sorted = [...batches].sort(
    (a, b) =>
      (batchTimeToMinutes(a.startTime) as number) -
      (batchTimeToMinutes(b.startTime) as number)
  );
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = batchTimeToMinutes(sorted[i - 1].endTime) as number;
    const start = batchTimeToMinutes(sorted[i].startTime) as number;
    if (start < prevEnd) {
      return {
        ok: false,
        message: `Batches cannot overlap: ${formatBatchTime(sorted[i - 1].startTime)}–${formatBatchTime(sorted[i - 1].endTime)} and ${formatBatchTime(sorted[i].startTime)}–${formatBatchTime(sorted[i].endTime)}.`
      };
    }
  }

  return {ok: true, batches};
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
   * Batch windows for the chosen day. Optional so a legacy pre-order (saved
   * before batches existed) can still be re-saved, but whenever batches are
   * supplied they must be structurally valid.
   */
  batches?: PreOrderBatchInput[] | null;
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

  const batchCheck = validatePreOrderBatches(input.batches);
  if (!batchCheck.ok) return batchCheck;

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