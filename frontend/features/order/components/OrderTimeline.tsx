'use client';

import type {OrderActor, OrderHistoryEntry} from '@/lib/api/orderApi';
import {staffStatusLabel} from '@/lib/orders/orderFlow';

/** "Ana Cruz (cashier)", "placed by customer", "Auto-cancel (system)". */
export function actorText(actor?: OrderActor | null, status?: string): string | null {
  if (!actor) return status === 'pending' ? 'placed by customer' : null;
  const role = actor.type === 'admin' ? 'owner' : actor.type;
  if (actor.type === 'customer' || actor.type === 'guest') {
    return status === 'pending' ? 'placed by customer' : `by ${actor.name ?? 'customer'} (customer)`;
  }
  return `by ${actor.name ?? role} (${role})`;
}

function time(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

/**
 * Status timeline with who moved the order at each step. Entries recorded
 * before staff tracking show the time only.
 */
export function OrderTimeline({order, className = ''}: {order: OrderHistoryEntry; className?: string}) {
  const history = order.statusHistory ?? [];
  if (history.length === 0) return null;
  return (
    <section className={className}>
      <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-gray-400">
        Timeline
      </h3>
      {order.handledBy?.name ? (
        <p className="mb-2 text-[0.8rem] text-[#6B7280] dark:text-gray-400">
          Handled by{' '}
          <span className="font-semibold text-[#1A1A1A] dark:text-gray-100">{order.handledBy.name}</span>
        </p>
      ) : null}
      <ol className="space-y-2 border-l-2 border-[#E5E7EB] pl-3 dark:border-gray-700">
        {history.map((entry, index) => {
          const who = actorText(entry.by, entry.status);
          return (
            <li key={`${entry.status}-${index}`} className="text-[0.8rem]">
              <span className="font-semibold text-[#1A1A1A] dark:text-gray-100">
                {staffStatusLabel(order, entry.status)}
              </span>
              <span className="ml-2 text-[#6B7280] dark:text-gray-400">{time(entry.at)}</span>
              {who ? <span className="ml-1 text-[#6B7280] dark:text-gray-400">· {who}</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
