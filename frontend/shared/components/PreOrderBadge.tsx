import {CalendarClock} from 'lucide-react';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

const SCHEDULE_LABEL = {standard: 'SCHEDULED', bulk: 'BULK PRE-ORDER', lechon: 'LECHON PRE-ORDER'} as const;

/**
 * Customer-scheduled order: "BULK PRE-ORDER · Nov 20 · 1:00 PM", plus
 * "Pay by …" while the confirmed order waits for its first payment.
 */
function ScheduledBadge({order, className}: {order: OrderHistoryEntry; className: string}) {
  if (!order.scheduledAt || order.schedule?.timing !== 'scheduled') return null;
  const at = new Date(order.scheduledAt);
  const day = at.toLocaleDateString('en-PH', {timeZone: 'Asia/Manila', month: 'short', day: 'numeric'});
  const time = at.toLocaleTimeString('en-PH', {timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit'});
  const showDue =
    order.paymentDueAt &&
    order.orderStatus === 'confirmed' &&
    (order.paymentStatus ?? 'unpaid') === 'unpaid';
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
        <CalendarClock size={11} />
        {SCHEDULE_LABEL[order.schedule.tier] ?? 'SCHEDULED'} · {day} · {time}
      </span>
      {showDue ? (
        <span className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          Pay by{' '}
          {new Date(order.paymentDueAt as string).toLocaleString('en-PH', {
            timeZone: 'Asia/Manila',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </span>
      ) : null}
    </span>
  );
}

/**
 * "PRE-ORDER · Dec 24 · 8 - 9 AM" for dated Holiday Pre-orders, the
 * scheduled time for customer pre-orders; null for ASAP orders.
 */
export function PreOrderBadge({order, className = ''}: {order: OrderHistoryEntry; className?: string}) {
  const po = order.isPreOrder ? order.preOrder : null;
  if (!po) return <ScheduledBadge order={order} className={className} />;
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
