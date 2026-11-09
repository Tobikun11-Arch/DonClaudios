import {CalendarClock} from 'lucide-react';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

/** "PRE-ORDER · Dec 24 · 8 - 9 AM" for dated Holiday Pre-orders; null otherwise. */
export function PreOrderBadge({order, className = ''}: {order: OrderHistoryEntry; className?: string}) {
  const po = order.isPreOrder ? order.preOrder : null;
  if (!po) return null;
  const day = new Date(po.pickupAt).toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric'
  });
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 ${className}`}
    >
      <CalendarClock size={11} />
      PRE-ORDER · {day} · {po.slotLabel}
      {po.receiveMethod === 'lalamove' ? ' · Lalamove' : ''}
    </span>
  );
}

/** Product name plus the pre-order size, e.g. "Lechon Belly (4-5 KG)". */
export function withSize(name: string, sizeLabel?: string | null) {
  return sizeLabel ? `${name} (${sizeLabel})` : name;
}
