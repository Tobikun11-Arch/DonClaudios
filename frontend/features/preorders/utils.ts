import type {PreOrderStatus} from '@/lib/api/preOrderApi';

export const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;

/** Same defaults as the backend (DEFAULT_SLOTS). */
export const DEFAULT_SLOTS = [
  {startTime: '08:00', endTime: '09:00'},
  {startTime: '10:00', endTime: '11:00'},
  {startTime: '12:00', endTime: '13:00'},
  {startTime: '14:00', endTime: '15:00'},
  {startTime: '16:00', endTime: '17:00'},
  {startTime: '18:00', endTime: '19:00'},
  {startTime: '20:00', endTime: '21:00'}
];

/**
 * Customer-facing slot label built from its times, e.g. "8 - 9 AM" or
 * "11 AM - 12 PM". Same rule as the backend's slotLabel().
 */
export function slotLabel(startTime: string, endTime: string): string {
  const part = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const hour = h % 12 === 0 ? 12 : h % 12;
    return {text: m ? `${hour}:${String(m).padStart(2, '0')}` : String(hour), meridiem: h < 12 ? 'AM' : 'PM'};
  };
  const a = part(startTime);
  const b = part(endTime);
  return a.meridiem === b.meridiem
    ? `${a.text} - ${b.text} ${b.meridiem}`
    : `${a.text} ${a.meridiem} - ${b.text} ${b.meridiem}`;
}

/** "HH:MM" plus minutes, capped at 23:59 (slots never cross midnight). */
export function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
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
