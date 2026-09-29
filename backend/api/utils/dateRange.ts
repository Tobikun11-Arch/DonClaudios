/**
 * Every report in this app is bucketed by business day, and the business is in
 * the Philippines. Asia/Manila is a fixed UTC+8 with no daylight saving, so a
 * constant offset is exact year-round — no tz database lookup needed.
 *
 * The bug this replaces: `orders` were grouped with `$dateToString` (which
 * buckets in UTC) while the day boundaries were computed with `setHours(0,0,0,0)`
 * in server-local time. In the Philippines those disagreed by 8 hours, so any
 * order placed after ~4pm landed on the previous day in charts.
 */
export const REPORT_TIMEZONE = 'Asia/Manila';

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Guard rail so a single request can never ask the database to scan forever. */
export const MAX_RANGE_DAYS = 400;

export type RangePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | '90d'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

export type ReportGranularity = 'day' | 'week' | 'month';

export interface ResolvedRange {
  /** Inclusive start, as a UTC instant. */
  from: Date;
  /** Exclusive end, as a UTC instant. */
  to: Date;
  /** Same-length window immediately before `from`, for % deltas. */
  prevFrom: Date;
  /** Exclusive end of the comparison window. */
  prevTo: Date;
  preset: RangePreset;
  label: string;
  days: number;
  /** Sensible default bucketing for the span. */
  granularity: ReportGranularity;
}

/** The calendar day a moment belongs to, in Manila, as `YYYY-MM-DD`. */
export function toManilaDayKey(date: Date): string {
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC instant of 00:00 Manila on the day containing `date`. */
export function manilaDayStartUtc(date: Date): Date {
  const key = toManilaDayKey(date);
  return new Date(new Date(`${key}T00:00:00.000Z`).getTime() - MANILA_OFFSET_MS);
}

/** UTC instant of 00:00 Manila on the day AFTER the one containing `date`. */
export function manilaDayEndUtc(date: Date): Date {
  return new Date(manilaDayStartUtc(date).getTime() + DAY_MS);
}

export function addManilaDays(date: Date, days: number): Date {
  return new Date(manilaDayStartUtc(date).getTime() + days * DAY_MS);
}

function monthStartUtc(date: Date): Date {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  const key = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return new Date(new Date(`${key}T00:00:00.000Z`).getTime() - MANILA_OFFSET_MS);
}

function addManilaMonths(date: Date, months: number): Date {
  const shifted = new Date(date.getTime() + MANILA_OFFSET_MS);
  const target = new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + months, 1)
  );
  return new Date(target.getTime() - MANILA_OFFSET_MS);
}

/** Parses a `YYYY-MM-DD` query param, or a full ISO timestamp. Null if unusable. */
export function parseDateInput(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function countManilaDays(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
}

export function defaultGranularity(days: number): ReportGranularity {
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  return 'month';
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** "Sep 1 – Sep 30, 2026" for the report header and PDF letterhead. */
export function formatRangeLabel(from: Date, to: Date): string {
  const start = new Date(from.getTime() + MANILA_OFFSET_MS);
  // `to` is exclusive, so display the last day actually included.
  const end = new Date(to.getTime() - 1 + MANILA_OFFSET_MS);
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startText = `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}${
    sameYear ? '' : `, ${start.getUTCFullYear()}`
  }`;
  const endText = `${MONTHS[end.getUTCMonth()]} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  return `${startText} – ${endText}`;
}

/** Every `YYYY-MM-DD` day key in `[from, to)`, so gaps get zero-filled. */
export function buildDayBuckets(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const total = countManilaDays(from, to);
  for (let i = 0; i < total; i += 1) {
    keys.push(toManilaDayKey(new Date(from.getTime() + i * DAY_MS)));
  }
  return keys;
}

const GRANULARITY_FORMAT: Record<ReportGranularity, string> = {
  day: '%Y-%m-%d',
  // %G/%V is the ISO-8601 week number, so week buckets line up with the calendar.
  week: '%G-W%V',
  month: '%Y-%m'
};

/** ISO-8601 week key, matching Mongo's `%G-W%V`. */
export function isoWeekKey(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00.000Z`);
  const target = new Date(d);
  target.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const yearStart = Date.UTC(target.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((target.getTime() - yearStart) / DAY_MS + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Every bucket key in `[from, to)` for the given granularity, zero-filled.
 * Keys match `bucketExpression` output exactly so gaps become real zeroes
 * instead of a misleading straight line on the chart.
 */
export function buildBuckets(
  from: Date,
  to: Date,
  granularity: ReportGranularity
): string[] {
  const dayKeys = buildDayBuckets(from, to);
  if (granularity === 'day') return dayKeys;

  const collapsed: string[] = [];
  const seen = new Set<string>();
  for (const day of dayKeys) {
    const key = granularity === 'month' ? day.slice(0, 7) : isoWeekKey(day);
    if (seen.has(key)) continue;
    seen.add(key);
    collapsed.push(key);
  }
  return collapsed;
}

/** `$group` key expression for a time bucket, explicitly in Manila time. */
export function bucketExpression(
  field: string,
  granularity: ReportGranularity
): Record<string, unknown> {
  return {
    $dateToString: {
      format: GRANULARITY_FORMAT[granularity],
      date: `$${field}`,
      timezone: REPORT_TIMEZONE
    }
  };
}

interface ResolveRangeInput {
  preset?: unknown;
  from?: unknown;
  to?: unknown;
  now?: Date;
}

/** Single source of truth for accepted preset names. */
export const RANGE_PRESETS = [
  'today', 'yesterday', '7d', '30d', '90d', 'thisMonth', 'lastMonth', 'custom'
] as const;

function coercePreset(value: unknown): RangePreset {
  return (RANGE_PRESETS as readonly string[]).includes(value as string)
    ? (value as RangePreset)
    : '7d';
}

/**
 * Accepts the loose shapes callers use: `7`, `"7"`, `"7d"`, or a full preset
 * name. Anything unrecognised falls back to the 7-day default.
 */
export function normalizePreset(value: unknown): RangePreset {
  if (typeof value === 'number') return normalizePreset(String(value));
  if (typeof value !== 'string') return '7d';
  const trimmed = value.trim();
  if (trimmed === '') return '7d';

  if ((RANGE_PRESETS as readonly string[]).includes(trimmed)) {
    return trimmed as RangePreset;
  }

  // A bare number means "the last N days". Round *up* to the nearest preset the
  // system can actually produce, so asking for 7 days never returns 30.
  const numeric = Number(trimmed.replace(/[dD]$/, ''));
  if (Number.isFinite(numeric) && numeric > 0) {
    if (numeric <= 1) return 'today';
    if (numeric <= 7) return '7d';
    if (numeric <= 30) return '30d';
    if (numeric <= 90) return '90d';
  }
  return '7d';
}

export function resolveRange(input: ResolveRangeInput = {}): ResolvedRange {
  const now = input.now ?? new Date();
  const requested = coercePreset(input.preset);
  const parsedFrom = parseDateInput(input.from);
  const parsedTo = parseDateInput(input.to);

  let from: Date;
  let to: Date;
  let prevFrom: Date;
  let prevTo: Date;
  let preset = requested;

  const todayStart = manilaDayStartUtc(now);
  const tomorrow = addManilaDays(todayStart, 1);
  const thisMonthStart = monthStartUtc(now);

  if (requested === 'custom' && parsedFrom && parsedTo) {
    preset = 'custom';
    from = manilaDayStartUtc(parsedFrom);
    to = manilaDayEndUtc(parsedTo);
    if (to.getTime() <= from.getTime()) to = manilaDayEndUtc(from);
  } else if (requested === 'today') {
    from = todayStart;
    to = tomorrow;
  } else if (requested === 'yesterday') {
    from = addManilaDays(todayStart, -1);
    to = todayStart;
  } else if (requested === '30d') {
    from = addManilaDays(todayStart, -29);
    to = tomorrow;
  } else if (requested === '90d') {
    from = addManilaDays(todayStart, -89);
    to = tomorrow;
  } else if (requested === 'thisMonth') {
    from = thisMonthStart;
    to = tomorrow;
  } else if (requested === 'lastMonth') {
    from = addManilaMonths(thisMonthStart, -1);
    to = thisMonthStart;
  } else {
    preset = '7d';
    from = addManilaDays(todayStart, -6);
    to = tomorrow;
  }

  // Clamp so a stray query param cannot trigger an unbounded scan.
  const days = countManilaDays(from, to);
  if (days > MAX_RANGE_DAYS) {
    to = new Date(from.getTime() + MAX_RANGE_DAYS * DAY_MS);
  }

  const finalDays = countManilaDays(from, to);
  const spanMs = to.getTime() - from.getTime();

  if (preset === 'thisMonth' || preset === 'lastMonth') {
    // Compare like-for-like against the previous calendar period.
    prevFrom = addManilaMonths(from, -1);
    prevTo = from;
  } else {
    prevTo = from;
    prevFrom = new Date(from.getTime() - spanMs);
  }

  return {
    from,
    to,
    prevFrom,
    prevTo,
    preset,
    label: formatRangeLabel(from, to),
    days: finalDays,
    granularity: defaultGranularity(finalDays)
  };
}

/** Percent change, rounded to 1dp. Null when there is no baseline to compare to. */
export function percentDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Safe division that returns 0 rather than NaN/Infinity. */
export function safeRatio(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100) / 100;
}

/**
 * Safe division expressed as a percentage, so callers cannot forget the `* 100`
 * (which previously made a 6-of-8 repeat rate display as "0.75%").
 */
export function safePercent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}
