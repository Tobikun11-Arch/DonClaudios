'use client';

import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import {MessageCircle, Package, ChevronRight} from 'lucide-react';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import {useAllOrdersQuery, useUpdateOrderStatusMutation, useSendCashierOrderMessageMutation} from '@/lib/hooks/orders/useCashierOrder';
import {useAdminOrderMessagesQuery} from '@/lib/hooks/orders/useOrderMessage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import type {NormalizedApiError} from '@/lib/api/types';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'completed',
  'cancelled'
] as const;

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed'] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  on_the_way: 'On the Way',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function orderTypeLabel(orderType: string) {
  if (orderType === 'pickup') return 'Pickup';
  if (orderType === 'delivery') return 'Delivery';
  return 'Reservation';
}

function customerDisplay(order: OrderHistoryEntry) {
  if (order.guestInfo) {
    return `${order.guestInfo.firstName} ${order.guestInfo.lastName}`.trim();
  }
  return order.isGuest
    ? 'Guest'
    : `Customer #${String(order._id).slice(-6).toUpperCase()}`;
}

function statusChipClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'confirmed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'preparing':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'ready':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'on_the_way':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'completed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function CashierOrders() {
  const {data, isLoading, isError} = useAllOrdersQuery();
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const orders = data?.orders ?? [];

  const visibleOrders = useMemo(() => {
    if (statusFilter === 'all') return orders;
    if (statusFilter === 'active') {
      return orders.filter(o => STATUS_FLOW.includes(o.orderStatus as never));
    }
    return orders.filter(o => o.orderStatus === statusFilter);
  }, [orders, statusFilter]);

  const handleNextStatus = async (order: OrderHistoryEntry) => {
    const idx = STATUS_FLOW.indexOf(order.orderStatus as never);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    try {
      await updateStatusMutation.mutateAsync({orderId: order._id, status: next});
      toast.success(`Order marked as ${formatStatus(next)}.`);
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to update status.'
      );
    }
  };

  const countFor = (status: string) =>
    status === 'active'
      ? orders.filter(o => STATUS_FLOW.includes(o.orderStatus as never)).length
      : status === 'all'
        ? orders.length
        : orders.filter(o => o.orderStatus === status).length;

  const filters = ['active', ...ORDER_STATUSES, 'all'];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#2d4a35]">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Live queue of all orders. Update status as orders progress, and reply
            to customer follow-ups.
          </p>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto scrollbar-hide border-b border-gray-200 px-1 sm:mx-0 sm:px-0 mb-5">
        <div className="flex min-w-max gap-1">
          {filters.map(f => {
            const active = statusFilter === f;
            const label = f === 'active' ? 'Active' : f === 'all' ? 'All' : formatStatus(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`
                  relative shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors
                  ${active ? 'bg-[#2d4a35] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}
                `}
              >
                {label}
                <span
                  className={`text-xs font-bold rounded-full px-1.5 min-w-5 text-center ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {countFor(f)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading orders...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load orders.
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No orders match this status.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              expanded={expandedId === order._id}
              onToggle={() =>
                setExpandedId(expandedId === order._id ? null : order._id)
              }
              onNextStatus={() => handleNextStatus(order)}
              statusUpdating={
                updateStatusMutation.isPending &&
                updateStatusMutation.variables?.orderId === order._id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onNextStatus,
  statusUpdating
}: {
  order: OrderHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  onNextStatus: () => void;
  statusUpdating: boolean;
}) {
  const messagesQuery = useAdminOrderMessagesQuery(order._id, expanded);
  const sendMutation = useSendCashierOrderMessageMutation();

  const statusIdx = STATUS_FLOW.indexOf(order.orderStatus as never);
  const canAdvance = statusIdx >= 0 && statusIdx < STATUS_FLOW.length - 1;

  const handleSend = async (text: string) => {
    try {
      await sendMutation.mutateAsync({orderId: order._id, body: text});
      toast.success('Reply sent.');
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to send reply.'
      );
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">
              {customerDisplay(order)}
            </p>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusChipClass(order.orderStatus)}`}
            >
              {formatStatus(order.orderStatus)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Order #{String(order._id).slice(-6).toUpperCase()} •{' '}
            {orderTypeLabel(order.orderType)} • ₱{order.totalAmount}.00
            {order.isGuest && (
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                GUEST
              </span>
            )}
          </p>
          {order.createdAt && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            <MessageCircle size={14} />
            Follow-up
            <ChevronRight
              size={14}
              className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        </div>
      </div>

      {order.items && order.items.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.items.map((item, i) => (
            <span
              key={i}
              className="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-600"
            >
              {item.quantity}× {item.name || 'Item'}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        {canAdvance ? (
          <button
            onClick={onNextStatus}
            disabled={statusUpdating}
            className="rounded-xl bg-[#2d4a35] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#3a5c44] disabled:opacity-50"
          >
            {statusUpdating
              ? 'Updating...'
              : `Mark ${formatStatus(STATUS_FLOW[statusIdx + 1])}`}
          </button>
        ) : (
          <span className="text-xs text-gray-400">
            {order.orderStatus === 'cancelled'
              ? 'Order was cancelled.'
              : 'Order completed.'}
          </span>
        )}
      </div>

      {expanded && (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Conversation with {customerDisplay(order)}
          </p>
          {messagesQuery.isLoading ? (
            <div className="text-sm text-gray-500">Loading conversation...</div>
          ) : messagesQuery.isError ? (
            <div className="text-sm text-red-600">
              Failed to load conversation.
            </div>
          ) : (
            <OrderChatThread
              messages={messagesQuery.data?.messages ?? []}
              sending={sendMutation.isPending}
              onSubmit={handleSend}
              placeholder="Reply to the customer..."
              teamOnRight
            />
          )}
        </div>
      )}
    </div>
  );
}