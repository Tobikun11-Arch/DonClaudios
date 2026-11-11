'use client';

import {UtensilsCrossed} from 'lucide-react';
import type {OrderHistoryEntry, OrderHistoryItem} from '@/lib/api/orderApi';

const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;

function itemName(item: OrderHistoryItem): string {
  if (item.name) return item.name;
  if (typeof item.productId !== 'string' && item.productId.name) return item.productId.name;
  return 'Item';
}

function itemImage(item: OrderHistoryItem): string | undefined {
  if (item.imageUrl) return item.imageUrl;
  if (typeof item.productId !== 'string') return item.productId.imageUrl;
  return undefined;
}

function fulfillmentLabel(order: OrderHistoryEntry): string {
  if (order.orderType === 'delivery') return 'Delivery';
  if (order.orderType === 'reservation') return 'Reservation';
  return 'Pickup';
}

export function UsualOrderCard({orders}: {orders: OrderHistoryEntry[]}) {
  // The most recent order that actually went through; a cancelled one is a
  // poor guess at what the customer usually gets.
  const order = orders.find(o => o.orderStatus !== 'cancelled') ?? orders[0];

  if (!order) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">Your usual order</h2>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No orders yet. Once you place one, your go-to lechon setup shows up
          here.
        </p>
      </div>
    );
  }

  const date = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-[#2d4a35] dark:text-[#7ed4a0]">Your usual order</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {[fulfillmentLabel(order), date].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Capped height so a long order scrolls inside the card instead of
          stretching the whole profile page. */}
      <ul className="subtle-scrollbar mt-4 max-h-80 divide-y divide-gray-100 overflow-y-auto pr-1 dark:divide-gray-800">
        {order.items.map((item, i) => {
          const name = itemName(item);
          const img = itemImage(item);
          return (
            <li key={item._id ?? `${name}-${i}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-gray-300 dark:text-gray-600">
                    <UtensilsCrossed className="h-5 w-5" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {[item.sizeLabel, `Qty ${item.quantity}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-[#2d4a35] dark:text-[#7ed4a0]">
                {peso(item.price * item.quantity)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
