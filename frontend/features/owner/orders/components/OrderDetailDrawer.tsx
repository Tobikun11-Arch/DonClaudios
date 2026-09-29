'use client';

import {useEffect} from 'react';
import {X} from 'lucide-react';
import {OrderStatusPill, OrderTypePill, formatStatus} from './OrderPills';
import {itemName, orderCustomerName} from '../hooks/useOwnerOrders';
import {formatPeso, titleCaseStatus} from '../../dashboard/components/reports/reportPrimitives';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function nextStatuses(order: OrderHistoryEntry) {
  if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') return [];
  const flow = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'completed'];
  const index = flow.indexOf(order.orderStatus);
  return index >= 0 ? flow.slice(index + 1) : [];
}

export function OrderDetailDrawer({
  order,
  onClose,
  onUpdateStatus,
  isUpdating
}: {
  order: OrderHistoryEntry | null;
  onClose: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  isUpdating: boolean;
}) {
  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // Prevent the page behind the overlay from scrolling on mobile.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [order, onClose]);

  if (!order) return null;

  const upcoming = nextStatuses(order);
  const items = order.items ?? [];
  const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <button
        type="button"
        aria-label="Close order details"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order._id}`}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E5E7EB] bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              Order detail
            </p>
            <p className="truncate font-mono text-[0.95rem] font-bold text-[#1A1A1A]">
              #{order._id.slice(-8).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#6B7280] transition-colors hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusPill status={order.orderStatus} />
            <OrderTypePill type={order.orderType} />
            {order.paymentMethod && (
              <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[0.7rem] font-semibold capitalize text-gray-600">
                {order.paymentMethod}
              </span>
            )}
            {order.isGuest && (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-700">
                Guest
              </span>
            )}
          </div>

          {upcoming.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                Move to
              </h3>
              <div className="flex flex-wrap gap-2">
                {upcoming.map(status => (
                  <button
                    key={status}
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onUpdateStatus(order._id, status)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-gray-700 transition-colors hover:border-[#2d4a35] hover:bg-[#E8F0E3] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {formatStatus(status)}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onUpdateStatus(order._id, 'cancelled')}
                  className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-[#F7FAF6] px-3 py-2.5">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                Placed
              </p>
              <p className="mt-0.5 text-[0.82rem] font-semibold text-[#1A1A1A]">
                {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className="rounded-lg bg-[#F7FAF6] px-3 py-2.5">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                Ready by
              </p>
              <p className="mt-0.5 text-[0.82rem] font-semibold text-[#1A1A1A]">
                {order.estimatedReadyAt
                  ? formatDateTime(order.estimatedReadyAt)
                  : order.estimatedPrepMinutes
                    ? `${order.estimatedPrepMinutes} min`
                    : '—'}
              </p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              Customer
            </h3>
            <p className="text-[0.9rem] font-semibold text-[#1A1A1A]">
              {orderCustomerName(order)}
            </p>
            {order.guestInfo?.phoneNumber && (
              <p className="text-[0.82rem] text-[#6B7280]">{order.guestInfo.phoneNumber}</p>
            )}
            {order.guestInfo?.address && (
              <p className="mt-1 text-[0.82rem] leading-relaxed text-[#6B7280]">
                {order.guestInfo.address}
              </p>
            )}
            {order.riderNotes && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-800">
                Note: {order.riderNotes}
              </p>
            )}
            {order.changeFor && (
              <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[0.8rem] text-sky-800">
                Change for: {order.changeFor}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              Items
            </h3>
            <ul className="divide-y divide-[#E5E7EB] rounded-xl border border-[#E5E7EB]">
              {items.length === 0 && (
                <li className="px-3 py-3 text-[0.82rem] text-[#6B7280]">
                  No line items recorded for this order.
                </li>
              )}
              {items.map((item, index) => (
                <li key={item._id ?? index} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[0.85rem] font-medium text-[#1A1A1A]">
                      {itemName(item) || 'Removed product'}
                    </p>
                    <p className="text-[0.75rem] text-[#6B7280]">
                      {item.quantity} × {formatPeso(item.price, item.price % 1 !== 0)}
                    </p>
                    {item.specialRequest && (
                      <p className="mt-0.5 text-[0.75rem] italic text-[#6B7280]">
                        {item.specialRequest}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-[0.85rem] font-semibold tabular-nums text-[#1A1A1A]">
                    {formatPeso(item.quantity * item.price, (item.quantity * item.price) % 1 !== 0)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-3 space-y-1.5 text-[0.85rem]">
              <div className="flex justify-between text-[#6B7280]">
                <dt>Items subtotal</dt>
                <dd className="tabular-nums">{formatPeso(itemsTotal, itemsTotal % 1 !== 0)}</dd>
              </div>
              {Boolean(order.deliveryFee) && (
                <div className="flex justify-between text-[#6B7280]">
                  <dt>Delivery fee</dt>
                  <dd className="tabular-nums">
                    {formatPeso(order.deliveryFee ?? 0, (order.deliveryFee ?? 0) % 1 !== 0)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E5E7EB] pt-1.5 font-bold text-[#1A1A1A]">
                <dt>Total charged</dt>
                <dd className="tabular-nums">{formatPeso(order.totalAmount, order.totalAmount % 1 !== 0)}</dd>
              </div>
            </dl>
          </section>

          {order.cancelReason && (
            <section>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                Cancellation reason
              </h3>
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[0.82rem] text-red-700">
                {order.cancelReason}
              </p>
            </section>
          )}

          {order.statusHistory && order.statusHistory.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                Timeline
              </h3>
              <ol className="space-y-2 border-l-2 border-[#E5E7EB] pl-3">
                {order.statusHistory.map((entry, index) => (
                  <li key={`${entry.status}-${index}`} className="text-[0.8rem]">
                    <span className="font-semibold text-[#1A1A1A]">
                      {titleCaseStatus(entry.status)}
                    </span>
                    <span className="ml-2 text-[#6B7280]">{formatDateTime(entry.at)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
