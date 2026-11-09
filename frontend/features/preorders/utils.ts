import type {PreOrderStatus} from '@/lib/api/preOrderApi';

export const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;

/** Same defaults as the backend (DEFAULT_SLOTS). */
export const DEFAULT_SLOTS = [
  {label: '8 - 9 AM', startTime: '08:00'},
  {label: '10 - 11 AM', startTime: '10:00'},
  {label: '12 - 1 PM', startTime: '12:00'},
  {label: '2 - 3 PM', startTime: '14:00'},
  {label: '4 - 5 PM', startTime: '16:00'},
  {label: '6 - 7 PM', startTime: '18:00'},
  {label: '8 PM', startTime: '20:00'}
];
export const DEFAULT_SLOT_LIMIT = 40;
export const DEFAULT_SIZE_STOCK = 10;
export const DEFAULT_MAX_PER_ORDER = 1;
export const DEFAULT_CANCEL_CUTOFF_DAYS = 14;

export const STATUS_STYLE: Record<PreOrderStatus, {label: string; className: string}> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300'
  },
  published: {
    label: 'Open',
    className: 'bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]'
  },
  closed: {
    label: 'Closed',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
  }
};

/** "2026-12-24" -> Date at local noon, safe for display in any timezone. */
export function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function shortDate(ymd: string) {
  return ymdToDate(ymd).toLocaleDateString('en-PH', {month: 'short', day: 'numeric'});
}

export function weekday(ymd: string) {
  return ymdToDate(ymd).toLocaleDateString('en-PH', {weekday: 'long'});
}

/** Whole days from today (Manila) to the pickup date. */
export function daysUntil(ymd: string) {
  const today = new Date(new Date().toLocaleString('en-US', {timeZone: 'Asia/Manila'}));
  today.setHours(12, 0, 0, 0);
  return Math.round((ymdToDate(ymd).getTime() - today.getTime()) / 86400000);
}

/** Next calendar day as YYYY-MM-DD. */
export function nextDay(ymd: string) {
  const d = ymdToDate(ymd);
  d.setDate(d.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Last full day a customer can cancel, e.g. "December 9". The deadline is the
 * midnight that starts the next day, so step back 1 ms before formatting.
 */
export function manilaLongDate(iso: string) {
  return new Date(new Date(iso).getTime() - 1).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'long',
    day: 'numeric'
  });
}
