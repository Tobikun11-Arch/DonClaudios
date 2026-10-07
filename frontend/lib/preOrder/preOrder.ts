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

/** One batch as stored on the product (see backend Product.model). */
export type PreOrderBatch = {
  startTime: string;
  endTime: string;
  stock: number;
  sold?: number | null;
};

export type PreOrderBatchStatus = 'upcoming' | 'live' | 'sold_out' | 'ended';

export type PreOrderBatchState = {
  index: number;
  /** Chronological position (1-based) — what "Batch 2" refers to. */
  number: number;
  startTime: string;
  endTime: string;
  stock: number;
  sold: number;
  remaining: number;
  status: PreOrderBatchStatus;
};

export type PreOrderState = {
  hasBatches: boolean;
  batches: PreOrderBatchState[];
  liveBatch: PreOrderBatchState | null;
  nextBatch: PreOrderBatchState | null;
  orderable: boolean;
  allDone: boolean;
};

export type PreOrderProduct = {
  isPreOrder?: boolean | null;
  preOrderPurchaseLimit?: number | null;
  preOrderDeadline?: string | null;
  preOrderBatches?: PreOrderBatch[] | null;
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

/* ------------------------------------------------------------------ *
 * BATCHES
 * ------------------------------------------------------------------ */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "08:30" -> 510. Null for anything unparseable. */
export function batchTimeToMinutes(value: string): number | null {
  if (!TIME_PATTERN.test((value ?? '').trim())) return null;
  const [h, m] = value.trim().split(':').map(Number);
  return h * 60 + m;
}

/** e.g. "3:00 PM" — store-local wall-clock time. */
export function formatBatchTime(time: string): string {
  const minutes = batchTimeToMinutes(time);
  if (minutes === null) return time;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Store-local "HH:MM" on the calendar day the deadline falls on. */
function timeOnDeadlineDay(deadline: Date, time: string): Date | null {
  const minutes = batchTimeToMinutes(time);
  if (minutes === null) return null;
  const day = new Date(
    deadline.getTime() + PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);
  const [y, m, d] = day.split('-').map(Number);
  return new Date(
    Date.UTC(y, m - 1, d, 0, minutes) - PRE_ORDER_TZ_OFFSET_MINUTES * 60 * 1000
  );
}

/**
 * Batch-aware pre-order state, derived from the product data plus the
 * clock. Mirrors `getPreOrderState` in backend/api/config/preOrder.ts.
 *
 * Products saved before batches existed report `hasBatches: false` and keep
 * the old all-day behavior.
 */
export function getPreOrderState(
  p?: PreOrderProduct | null,
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
  if (!isPreOrderProduct(p)) return empty;

  const hasDeadline = !!p?.preOrderDeadline;
  const deadline = p?.preOrderDeadline ? new Date(p.preOrderDeadline) : null;
  const deadlineValid = deadline !== null && !Number.isNaN(deadline.getTime());
  const raw = p?.preOrderBatches ?? [];

  if (raw.length === 0) {
    const closed = !hasDeadline || isPreOrderClosed(p, now);
    return {...empty, orderable: !closed, allDone: closed};
  }

  // Chronological numbering so "Batch 2" always means the second window of
  // the day, whatever order the owner entered the rows in.
  const order = [...raw]
    .map((b, i) => ({i, m: batchTimeToMinutes(b.startTime) ?? 0}))
    .sort((a, b) => a.m - b.m);
  const numberByIndex = new Map<number, number>();
  order.forEach((entry, position) =>
    numberByIndex.set(entry.i, position + 1)
  );

  const batches: PreOrderBatchState[] = raw.map((b, index) => {
    const start = deadlineValid
      ? timeOnDeadlineDay(deadline as Date, b.startTime)
      : null;
    const end = deadlineValid
      ? timeOnDeadlineDay(deadline as Date, b.endTime)
      : null;
    const sold = typeof b.sold === 'number' ? b.sold : 0;
    const remaining = Math.max(0, b.stock - sold);

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
      index,
      number: numberByIndex.get(index) ?? index + 1,
      startTime: b.startTime,
      endTime: b.endTime,
      stock: b.stock,
      sold,
      remaining,
      status
    };
  });

  const liveBatch = batches.find(b => b.status === 'live') ?? null;
  const nextBatch =
    batches
      .filter(b => b.status === 'upcoming')
      .sort(
        (a, b) =>
          (batchTimeToMinutes(a.startTime) ?? 0) -
          (batchTimeToMinutes(b.startTime) ?? 0)
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
 * Everything a card/detail page needs to render a pre-order honestly:
 * badge, status line, and whether the add button may be pressed.
 */
export type PreOrderDisplay = {
  /** No live batch and none coming — grey badge, disabled button. */
  closed: boolean;
  /** A batch window is open with stock left. */
  orderable: boolean;
  badge: string;
  statusLine: string;
  subLine: string;
};

export function preOrderDisplay(
  p?: PreOrderProduct | null,
  now: Date = new Date()
): PreOrderDisplay {
  const limit = preOrderLimitLabel(p);
  const state = getPreOrderState(p, now);

  // Legacy pre-order: one window, the whole day.
  if (!state.hasBatches) {
    const closed = isPreOrderClosed(p, now);
    return {
      closed,
      orderable: !closed,
      badge: closed ? 'PRE-ORDER CLOSED' : 'PRE-ORDER',
      statusLine: closed ? 'Pre-order closed' : preOrderDeadlineLabel(p),
      subLine: limit
    };
  }

  const {liveBatch, nextBatch} = state;

  if (liveBatch) {
    return {
      closed: false,
      orderable: true,
      badge: 'PRE-ORDER LIVE',
      statusLine: `Batch ${liveBatch.number} live until ${formatBatchTime(liveBatch.endTime)}`,
      subLine: `${liveBatch.remaining} of ${liveBatch.stock} left${limit ? ` · ${limit}` : ''}`
    };
  }

  if (nextBatch) {
    const justEnded =
      state.batches.find(b => b.status === 'ended') ??
      state.batches.find(b => b.status === 'sold_out');
    const prefix = justEnded
      ? justEnded.status === 'sold_out'
        ? `Batch ${justEnded.number} sold out`
        : `Batch ${justEnded.number} done`
      : null;
    return {
      closed: false,
      orderable: false,
      badge: 'PRE-ORDER',
      statusLine: `${prefix ? `${prefix} · ` : ''}next batch ${formatBatchTime(nextBatch.startTime)}`,
      subLine: limit
    };
  }

  // Date passed or every batch finished.
  return {
    closed: true,
    orderable: false,
    badge: 'PRE-ORDER CLOSED',
    statusLine: 'Pre-order closed',
    subLine: limit
  };
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

/** e.g. "Max 2 per customer" — per batch when the product has batches. */
export function preOrderLimitLabel(p?: PreOrderProduct | null): string {
  const limit = p?.preOrderPurchaseLimit;
  if (typeof limit !== 'number' || !Number.isFinite(limit) || limit < 1) {
    return '';
  }
  const perBatch =
    Array.isArray(p?.preOrderBatches) && p.preOrderBatches.length > 0;
  return perBatch
    ? `Max ${limit} per customer per batch`
    : `Max ${limit} per customer`;
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