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

import {useState, useEffect} from 'react';
/** Hook that returns current Date, updating every second. */
export function useNow(interval = 1000): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}


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
  /** Absolute dates for UI (in store local time context converted to Date) */
  startsAt?: Date | null;
  endsAt?: Date | null;
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
  price?: number | null;
  name?: string;
  category?: string;
  imageUrl?: string;
  description?: string;
  allergens?: string[] | null;
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
      status,
      startsAt: start,
      endsAt: end
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
export function dateLabel(targetDate: Date, now: Date = new Date()): string {
  const startOfDay = (d: Date) => {
    const nd = new Date(d.getTime());
    nd.setHours(0, 0, 0, 0);
    return nd;
  };
  const n = startOfDay(now);
  const t = startOfDay(targetDate);
  const diff = Math.floor((t.getTime() - n.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return targetDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

export function timeRangeLabel(batch: {startTime: string; endTime: string}): string {
  return `${formatBatchTime(batch.startTime)} – ${formatBatchTime(batch.endTime)}`;
}

export function scheduleLabel(batch: {startTime: string; endTime: string}, date: Date, now: Date = new Date()): string {
  return `${dateLabel(date, now)} · ${timeRangeLabel(batch)}`;
}

export function formatPeso(n: number): string {
  return `₱${Math.round(n).toLocaleString('en-US')}`;
}

export function formatCountdown(ms: number): {hours: string; minutes: string; seconds: string} {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0')
  };
}

export type PreOrderUiState =
  | 'live'
  | 'live_low'
  | 'waiting'
  | 'sold_out_next'
  | 'sold_out_final'
  | 'closed';

export type PreOrderDisplayExtended = PreOrderDisplay & {
  uiState: PreOrderUiState;
  singleBatch: boolean;
  remaining: number;
  stock: number;
  percentLeft: number;
  startsAt: Date | null;
  endsAt: Date | null;
  nextStartAt: Date | null;
  scheduleLabel: string;
  dateLabel: string;
  timeRangeLabel: string;
  countdownTarget: Date | null;
  countdownLabel: string;
  limitLabel: string;
  badgeText: string;
  headline: string;
  buttonLabel: string;
};

export function preOrderDisplayExtended(
  p?: PreOrderProduct | null,
  now: Date = new Date()
): PreOrderDisplayExtended {
  const base = preOrderDisplay(p, now);
  const limit = preOrderLimitLabel(p);
  const state = getPreOrderState(p, now);
  const singleBatch = Array.isArray(p?.preOrderBatches) && p.preOrderBatches.length === 1;

  if (!state.hasBatches) {
    const closed = isPreOrderClosed(p, now);
    const deadlineDayStr = deadlineDay(p?.preOrderDeadline);
    const deadlineDate = deadlineDayStr ? new Date(deadlineDayStr + 'T00:00:00') : (p?.preOrderDeadline ? new Date(p.preOrderDeadline) : new Date());
    return {
      ...base,
      uiState: closed ? 'closed' : 'waiting',
      singleBatch: true,
      remaining: 0,
      stock: 0,
      percentLeft: 0,
      startsAt: deadlineDate,
      endsAt: deadlineDate,
      nextStartAt: null,
      scheduleLabel: deadlineDayStr ? `${dateLabel(deadlineDate, now)} · Pre-order` : (closed ? 'Pre-order closed' : 'Pre-order'),
      dateLabel: deadlineDayStr ? dateLabel(deadlineDate, now) : '',
      timeRangeLabel: '',
      countdownTarget: closed ? null : deadlineDate,
      countdownLabel: closed ? '' : 'Opens in',
      limitLabel: limit,
      badgeText: closed ? 'Closed' : 'Opens soon',
      headline: closed ? 'Pre-order closed' : 'Pre-order',
      buttonLabel: closed ? 'Pre-order closed' : 'Pre-order'
    };
  }

  if (state.liveBatch) {
    const lb = state.liveBatch;
    const startsAt = lb.startsAt || null;
    const endsAt = lb.endsAt || null;
    const remaining = lb.remaining;
    const stock = lb.stock;
    const percentLeft = stock <= 0 ? 0 : Math.round((remaining / stock) * 100);
    const low = remaining <= Math.max(1, Math.floor(stock * 0.2)) || remaining <= 5;
    const uiState: PreOrderUiState = low ? 'live_low' : 'live';
    const batch = {startTime: lb.startTime, endTime: lb.endTime};
    const schedDate = endsAt || (startsAt || new Date());
    const limitLabel = singleBatch ? (limit.replace(' per batch', '')) : limit;
    return {
      ...base,
      uiState,
      singleBatch,
      remaining,
      stock,
      percentLeft,
      startsAt,
      endsAt,
      nextStartAt: state.nextBatch?.startsAt || null,
      scheduleLabel: scheduleLabel(batch, schedDate, now),
      dateLabel: dateLabel(schedDate, now),
      timeRangeLabel: timeRangeLabel(batch),
      countdownTarget: endsAt,
      countdownLabel: 'Closes in',
      limitLabel,
      badgeText: low ? 'Almost gone' : 'Order now',
      headline: singleBatch ? 'Pre-order is open' : `Batch ${lb.number} is open`,
      buttonLabel: singleBatch ? `Add to cart · ${formatPeso(p?.price || 0)}` : `Add to cart · ${formatPeso(p?.price || 0)}`
    };
  }

  if (state.nextBatch) {
    const nb = state.nextBatch;
    const startsAt = nb.startsAt || null;
    const batch = {startTime: nb.startTime, endTime: nb.endTime};
    const schedDate = startsAt || new Date();
    const justEnded = state.batches.find(b => b.status === 'ended') ?? state.batches.find(b => b.status === 'sold_out');
    const soldOutNext = justEnded?.status === 'sold_out' && !state.liveBatch;
    const uiState: PreOrderUiState = soldOutNext ? 'sold_out_next' : 'waiting';
    const limitLabel = singleBatch ? (limit.replace(' per batch', '')) : limit;
    const dlabel = dateLabel(schedDate, now);
    return {
      ...base,
      uiState,
      singleBatch,
      remaining: 0,
      stock: 0,
      percentLeft: 0,
      startsAt,
      endsAt: nb.endsAt || null,
      nextStartAt: startsAt,
      scheduleLabel: scheduleLabel(batch, schedDate, now),
      dateLabel: dlabel,
      timeRangeLabel: timeRangeLabel(batch),
      countdownTarget: startsAt,
      countdownLabel: 'Opens in',
      limitLabel,
      badgeText: soldOutNext ? 'Sold out' : 'Opens soon',
      headline: singleBatch
        ? (dlabel === 'Today' ? `Opens today at ${formatBatchTime(nb.startTime)}` : dlabel === 'Tomorrow' ? `Opens tomorrow at ${formatBatchTime(nb.startTime)}` : `Opens ${dlabel} at ${formatBatchTime(nb.startTime)}`)
        : (soldOutNext ? `Batch ${justEnded?.number} sold out` : `Opens ${dlabel.toLowerCase()} at ${formatBatchTime(nb.startTime)}`),
      buttonLabel: singleBatch
        ? (dlabel === 'Today' ? `Opens at ${formatBatchTime(nb.startTime)}` : dlabel === 'Tomorrow' ? `Opens tomorrow ${formatBatchTime(nb.startTime)}` : `Opens ${dlabel}, ${formatBatchTime(nb.startTime)}`)
        : (soldOutNext ? `Next opens ${formatBatchTime(nb.startTime)}` : `Opens ${formatBatchTime(nb.startTime)}`)
    };
  }

  // closed/final sold out
  const hasAnySoldOut = state.batches.some(b => b.status === 'sold_out');
  const uiState: PreOrderUiState = hasAnySoldOut ? 'sold_out_final' : 'closed';
  return {
    ...base,
    uiState,
    singleBatch,
    remaining: 0,
    stock: 0,
    percentLeft: 0,
    startsAt: null,
    endsAt: null,
    nextStartAt: null,
    scheduleLabel: base.closed ? 'Pre-order closed' : (hasAnySoldOut ? 'Sold out' : 'Pre-order closed'),
    dateLabel: '',
    timeRangeLabel: '',
    countdownTarget: null,
    countdownLabel: '',
    limitLabel: singleBatch ? (limit.replace(' per batch', '')) : limit,
    badgeText: hasAnySoldOut ? 'Sold out' : 'Closed',
    headline: hasAnySoldOut ? 'Sold out' : 'Pre-order closed',
    buttonLabel: hasAnySoldOut ? 'Sold out' : 'Pre-order closed'
  };
}
