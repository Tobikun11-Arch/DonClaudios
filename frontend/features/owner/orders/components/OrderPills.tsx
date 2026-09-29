'use client';

import {cn} from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-sky-50 text-sky-700 border-sky-200',
  preparing: 'bg-[#FDF6E3] text-[#8A6D1F] border-[#E8D8A8]',
  ready: 'bg-[#E8F0E3] text-[#3F6127] border-[#C6DDB2]',
  on_the_way: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-[#2d4a35] text-white border-[#2d4a35]',
  cancelled: 'bg-red-50 text-red-600 border-red-200'
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

export function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function OrderStatusPill({status}: {status: string}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[0.7rem] font-bold',
        STATUS_STYLES[status] ?? 'border-gray-200 bg-gray-50 text-gray-600'
      )}
    >
      {formatStatus(status)}
    </span>
  );
}

const TYPE_STYLES: Record<string, string> = {
  pickup: 'text-sky-700 bg-sky-50',
  delivery: 'text-indigo-700 bg-indigo-50',
  reservation: 'text-purple-700 bg-purple-50'
};

export function OrderTypePill({type}: {type: string}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[0.7rem] font-semibold capitalize',
        TYPE_STYLES[type] ?? 'bg-gray-50 text-gray-600'
      )}
    >
      {type}
    </span>
  );
}
