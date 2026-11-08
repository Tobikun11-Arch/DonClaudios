'use client';

import {cn} from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
  confirmed: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30',
  preparing: 'bg-[#FDF6E3] dark:bg-amber-500/10 text-[#8A6D1F] dark:text-amber-300 border-[#E8D8A8] dark:border-amber-500/30',
  ready: 'bg-[#E8F0E3] dark:bg-[#7ed4a0]/10 text-[#3F6127] dark:text-[#7ed4a0] border-[#C6DDB2] dark:border-[#7ed4a0]/30',
  on_the_way: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
  completed: 'bg-[#2d4a35] text-white border-[#2d4a35] dark:border-[#7ed4a0]/60',
  cancelled: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
};

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'completed',
  'cancelled'
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * UI-only sentinel for "no status filter". The endpoint's `status` enum has no
 * `all` member — an absent `status` already means every status — so the query
 * omits the param instead of sending this.
 */
export const ALL_STATUSES = 'all';

/** Options for the filter dropdown: `All` first, then each real status. */
export const ORDER_STATUS_FILTERS = [ALL_STATUSES, ...ORDER_STATUSES] as const;

export function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function OrderStatusPill({status}: {status: string}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-bold',
        STATUS_STYLES[status] ?? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
      )}
    >
      {formatStatus(status)}
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  pickup: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10',
  delivery: 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10',
  reservation: 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10'
};

export function OrderTypePill({type}: {type: string}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[0.7rem] font-semibold capitalize',
        TYPE_STYLES[type] ?? 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300'
      )}
    >
      {type}
    </span>
  );
}
