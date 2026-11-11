'use client';

import {Check, Pencil, Receipt} from 'lucide-react';
import type {CounterOrderEntry} from '@/lib/api/orderApi';
import {cn} from '@/lib/utils';
import {orderLabel, paymentMethodLabel, peso} from '../counterShared';

function orderTime(order: CounterOrderEntry): string {
  if (!order.createdAt) return '';
  return new Date(order.createdAt).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function itemCount(order: CounterOrderEntry): number {
  return (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
}

export default function RecentOrders({
  orders,
  loading,
  editingOrderId,
  markPaidPending,
  onMarkPaid,
  onEdit,
  onViewReceipt
}: {
  orders: CounterOrderEntry[];
  loading: boolean;
  editingOrderId: string | null;
  markPaidPending: boolean;
  onMarkPaid: (order: CounterOrderEntry) => void;
  onEdit: (order: CounterOrderEntry) => void;
  onViewReceipt: (order: CounterOrderEntry) => void;
}) {
  if (loading) {
    return <p className="px-4 py-6 text-sm text-gray-500">Loading orders…</p>;
  }
  if (orders.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-gray-500">
        No walk-in orders yet.
      </p>
    );
  }

  return (
    <ul className="subtle-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
      {orders.map(order => {
        const paid = order.paymentStatus === 'paid';
        const voided = order.orderStatus === 'cancelled';
        const count = itemCount(order);
        const editing = editingOrderId === order._id;
        return (
          <li
            key={order._id}
            className={cn(
              'rounded-xl border p-3',
              editing ? 'border-amber-300 bg-amber-50/60' : 'border-gray-100'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">{orderLabel(order)}</p>
                <p className="text-xs text-gray-500">
                  {[orderTime(order), count > 0 ? `${count} item${count !== 1 ? 's' : ''}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold tabular-nums text-gray-900">
                  {peso(order.totalAmount)}
                </p>
                <span
                  className={cn(
                    'mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-semibold',
                    voided
                      ? 'bg-gray-100 text-gray-600'
                      : paid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-800'
                  )}
                >
                  {voided
                    ? 'Voided'
                    : paid
                      ? `Paid · ${paymentMethodLabel(order.paymentMethod)}`
                      : 'Unpaid'}
                </span>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              {!paid && !voided ? (
                <>
                  <button
                    type="button"
                    disabled={markPaidPending}
                    onClick={() => onMarkPaid(order)}
                    className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#2d4a35] px-3 text-sm font-semibold text-white hover:bg-[#24402b] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Mark as paid
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${orderLabel(order)}`}
                    disabled={editing}
                    onClick={() => onEdit(order)}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onViewReceipt(order)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Receipt className="h-4 w-4" /> Receipt
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
