'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {toast} from 'sonner';
import {MessageCircle, Package, ChevronRight, ChevronDown, ChevronUp, User, Phone, MapPin, Clock} from 'lucide-react';
import {useScrollToHighlight} from '@/shared/hooks/useScrollToHighlight';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import {Modal} from '@/features/owner/cashiers/components/Modal';
import {Button} from '@/components/ui/button';
import {OrderDateFilter} from './OrderDateFilter';
import type {DateRange} from './OrderDateFilter';
import {OrderPrepBadge, OrderEstimateLabel} from './OrderPrepBadge';
import {useAllOrdersQuery, useUpdateOrderStatusMutation, useSendCashierOrderMessageMutation} from '@/lib/hooks/orders/useCashierOrder';
import {useAdminOrderMessagesQuery} from '@/lib/hooks/orders/useOrderMessage';
import type {OrderHistoryEntry, OrderHistoryItem} from '@/lib/api/orderApi';
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

export const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'completed'] as const;
export const CANCELLABLE = ['pending', 'confirmed', 'preparing'] as const;
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  on_the_way: 'On the Way',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status;
}

export function orderTypeLabel(orderType: string) {
  if (orderType === 'pickup') return 'Pickup';
  if (orderType === 'delivery') return 'Delivery';
  return 'Reservation';
}

export function customerDisplay(order: OrderHistoryEntry) {
  if (order.guestInfo) {
    return `${order.guestInfo.firstName} ${order.guestInfo.lastName}`.trim();
  }
  if (order.customerName) {
    return order.customerName;
  }
  return order.isGuest
    ? 'Guest'
    : `Customer #${String(order._id).slice(-6).toUpperCase()}`;
}

export function statusChipClass(status: string) {
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
  const [manualFilter, setManualFilter] = useState<{key: string | null; value: string}>({
    key: null,
    value: 'pending'
  });
  const [cancellingOrder, setCancellingOrder] = useState<OrderHistoryEntry | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({from: null, to: null});

  const orders = data?.orders ?? [];
  const {highlightId, isOpenChat} = useScrollToHighlight();
  const [expandedId, setExpandedId] = useState<string | null>(
    isOpenChat ? highlightId : null
  );
  const [prevOpenChat, setPrevOpenChat] = useState(isOpenChat);
  if (isOpenChat !== prevOpenChat) {
    setPrevOpenChat(isOpenChat);
    if (isOpenChat && highlightId) setExpandedId(highlightId);
  }

  const highlightKey = highlightId ?? null;
  const highlightedOrder = highlightId ? orders.find(o => o._id === highlightId) : undefined;
  const resolvedFilter =
    manualFilter.key === highlightKey
      ? manualFilter.value
      : (highlightedOrder?.orderStatus ?? manualFilter.value);
  // An overdue order should never hide behind a status dropdown selection.
  const statusFilter =
    highlightedOrder?.prepTiming?.isOverdue ? 'overdue' : resolvedFilter;

  const handleStatusFilterChange = (value: string) =>
    setManualFilter({key: highlightKey, value});

  const ordersInRange = useMemo(() => {
    if (dateRange.from === null && dateRange.to === null) return orders;
    const {from, to} = dateRange;
    return orders.filter(order => {
      const ts = new Date(order.createdAt ?? '').getTime();
      if (Number.isNaN(ts)) return false;
      if (from !== null && ts < from) return false;
      if (to !== null && ts > to) return false;
      return true;
    });
  }, [orders, dateRange]);

  const visibleOrders = useMemo(() => {
    if (statusFilter === 'all') return ordersInRange;
    if (statusFilter === 'overdue') {
      return ordersInRange.filter(o => o.prepTiming?.isOverdue);
    }
    if (statusFilter === 'active') {
      return ordersInRange.filter(o => STATUS_FLOW.includes(o.orderStatus as never));
    }
    return ordersInRange.filter(o => o.orderStatus === statusFilter);
  }, [ordersInRange, statusFilter]);

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

  const handleCancel = async (order: OrderHistoryEntry) => {
    try {
      await updateStatusMutation.mutateAsync({orderId: order._id, status: 'cancelled'});
      toast.success('Order cancelled.');
      setCancellingOrder(null);
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to cancel order.'
      );
    }
  };

  const countFor = (status: string) =>
    status === 'active'
      ? ordersInRange.filter(o => STATUS_FLOW.includes(o.orderStatus as never)).length
      : status === 'all'
        ? ordersInRange.length
        : ordersInRange.filter(o => o.orderStatus === status).length;

  const overdueCount = useMemo(
    () => ordersInRange.filter(o => o.prepTiming?.isOverdue).length,
    [ordersInRange]
  );

  const filters = ['overdue', 'active', ...ORDER_STATUSES, 'all'];
  const filterLabel = (f: string) => {
    if (f === 'overdue') return 'Overdue';
    if (f === 'active') return 'Active';
    if (f === 'all') return 'All';
    return formatStatus(f);
  };
  const filterCount = (f: string) =>
    f === 'overdue' ? overdueCount : countFor(f);

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

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label
          htmlFor="order-status-filter"
          className="text-sm font-semibold text-gray-600"
        >
          Status
        </label>
        <div className="relative">
          <select
            id="order-status-filter"
            value={statusFilter}
            onChange={e => handleStatusFilterChange(e.target.value)}
            className="appearance-none rounded-full border border-gray-200 bg-white py-2 pl-4 pr-10 text-sm font-semibold text-[#2d4a35] transition-colors hover:bg-gray-50 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
          >
            {filters.map(f => (
              <option key={f} value={f}>
                {filterLabel(f)} ({filterCount(f)})
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
        </div>
        <OrderDateFilter value={dateRange} onChange={setDateRange} />
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
            {dateRange.from !== null || dateRange.to !== null
              ? 'No orders match this status within the selected date range.'
              : 'No orders match this status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map(order => (
            <div key={order._id} id={`order-${order._id}`}>
              <OrderCard
                order={order}
                expanded={expandedId === order._id}
                onToggle={() =>
                  setExpandedId(expandedId === order._id ? null : order._id)
                }
                onNextStatus={() => handleNextStatus(order)}
                onCancel={() => setCancellingOrder(order)}
                statusUpdating={
                  updateStatusMutation.isPending &&
                  updateStatusMutation.variables?.orderId === order._id
                }
                cancelUpdating={
                  updateStatusMutation.isPending &&
                  (updateStatusMutation.variables?.orderId ?? null) ===
                    (cancellingOrder?._id ?? null)
                }
              />
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!cancellingOrder}
        title="Cancel order"
        onClose={() => setCancellingOrder(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel order{' '}
            <span className="font-bold text-gray-900">
              #
              {cancellingOrder
                ? String(cancellingOrder._id).slice(-6).toUpperCase()
                : ''}
            </span>{' '}
            from{' '}
            <span className="font-bold text-gray-900">
              {cancellingOrder ? customerDisplay(cancellingOrder) : ''}
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancellingOrder(null)}
              disabled={updateStatusMutation.isPending}
            >
              Keep Order
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() =>
                cancellingOrder && handleCancel(cancellingOrder)
              }
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending
                ? 'Cancelling…'
                : 'Cancel Order'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  onToggle,
  onNextStatus,
  onCancel,
  statusUpdating,
  cancelUpdating
}: {
  order: OrderHistoryEntry;
  expanded: boolean;
  onToggle: () => void;
  onNextStatus: () => void;
  onCancel: () => void;
  statusUpdating: boolean;
  cancelUpdating: boolean;
}) {
  const messagesQuery = useAdminOrderMessagesQuery(order._id, expanded);
  const sendMutation = useSendCashierOrderMessageMutation();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const statusIdx = STATUS_FLOW.indexOf(order.orderStatus as never);
  const canAdvance = statusIdx >= 0 && statusIdx < STATUS_FLOW.length - 1;

  const handleSend = async (text: string) => {
    try {
      await sendMutation.mutateAsync({orderId: order._id, body: text});
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to send reply.'
      );
    }
  };

  const items = order.items ?? [];
  const firstItem = items[0];
  const thumbUrl = firstItem ? getItemImage(firstItem) : undefined;
  const thumbName = firstItem ? getItemName(firstItem) : 'Order';
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discount = Math.max(0, subtotal - order.totalAmount);

  return (
    <div className="rounded-2xl bg-white shadow">
      <div
        onClick={() => setDetailsOpen(prev => !prev)}
        className="w-full cursor-pointer select-none p-5 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50">
            {firstItem ? (
              <Image
                src={
                  thumbUrl && thumbUrl.length > 0
                    ? thumbUrl
                    : '/assets/sample_menu.png'
                }
                alt={thumbName}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gray-50" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">
                {customerDisplay(order)}
              </p>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusChipClass(order.orderStatus)}`}
              >
                {formatStatus(order.orderStatus)}
              </span>
              <OrderPrepBadge
                timing={order.prepTiming}
                orderType={order.orderType}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Order #{String(order._id).slice(-6).toUpperCase()} •{' '}
              {orderTypeLabel(order.orderType)} • ₱{order.totalAmount}.00
              {order.isGuest && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  GUEST
                </span>
              )}
            </p>
            {order.createdAt && (
              <p className="mt-0.5 text-[11px] text-gray-400">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            )}
            {order.prepTiming?.isOverdue && (
              <p className="mt-1 text-[11px] font-semibold text-red-600">
                Started preparing{' '}
                {order.prepTiming.preparingAt
                  ? new Date(order.prepTiming.preparingAt).toLocaleTimeString()
                  : 'earlier'}
                .
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              <MessageCircle size={14} />
              Follow-up
              <ChevronRight
                size={14}
                className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
            </button>
            <span className="text-gray-400">
              {detailsOpen ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </span>
          </div>
        </div>
      </div>

      {detailsOpen && (
        <div className="border-t border-gray-100 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3">
              <User size={16} className="shrink-0 text-[#2d4a35]" />
              <span className="text-sm text-gray-600">
                {order.guestInfo
                  ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}`
                  : customerDisplay(order)}
              </span>
            </div>
            {order.guestInfo?.phoneNumber && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3">
                <Phone size={16} className="shrink-0 text-[#2d4a35]" />
                <span className="text-sm text-gray-600">
                  {order.guestInfo.phoneNumber}
                </span>
              </div>
            )}
            {order.guestInfo?.address && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3 sm:col-span-2">
                <MapPin size={16} className="shrink-0 text-[#2d4a35]" />
                <span className="text-sm text-gray-600">
                  {order.guestInfo.address}
                </span>
              </div>
            )}
          </div>

          {order.riderNotes && (
            <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                Rider / Notes
              </p>
              <p className="text-sm text-gray-700">{order.riderNotes}</p>
            </div>
          )}

          {order.paymentMethod === 'cash' && order.changeFor ? (
            <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-700">
                Change for
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {order.changeFor}
              </p>
            </div>
          ) : null}

          <div className="mt-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900">
              Order Items
            </h3>
            <div className="mb-3">
              <OrderEstimateLabel
                timing={order.prepTiming}
                orderType={order.orderType}
              />
            </div>
            <div className="space-y-3">
              {items.map((item, index) => {
                const imageUrl = getItemImage(item);
                return (
                  <div
                    key={item._id ?? `${order._id}-${index}`}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 p-3"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                      <Image
                        src={
                          imageUrl && imageUrl.length > 0
                            ? imageUrl
                            : '/assets/sample_menu.png'
                        }
                        alt={getItemName(item)}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold text-gray-900">
                        {getItemName(item)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Qty {item.quantity} • {money(item.price)} each
                        {item.prepTimeMinutes != null && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <Clock size={9} />~{item.prepTimeMinutes} min
                          </span>
                        )}
                      </p>
                      {item.prepTimeMinutes != null &&
                        order.prepTiming?.estimatedPrepMinutes != null &&
                        item.prepTimeMinutes ===
                          order.prepTiming.estimatedPrepMinutes && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-600">
                            Slowest item — sets the order estimate
                          </p>
                        )}
                      {item.specialRequest && (
                        <p className="mt-1 rounded-lg bg-orange-50 px-2 py-1 text-xs text-orange-700">
                          Request: {item.specialRequest}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-900">
                      {money(item.price * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-1 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{money(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <span className="font-semibold">-{money(discount)}</span>
                </div>
              )}
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-base font-extrabold text-gray-900">
                  {money(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-4">
        {canAdvance ? (
          <>
            <button
              onClick={onNextStatus}
              disabled={statusUpdating || cancelUpdating}
              className="rounded-xl bg-[#2d4a35] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#3a5c44] disabled:opacity-50"
            >
              {statusUpdating
                ? 'Updating...'
                : `Mark ${formatStatus(STATUS_FLOW[statusIdx + 1])}`}
            </button>
            {CANCELLABLE.includes(order.orderStatus as (typeof CANCELLABLE)[number]) && (
              <button
                onClick={onCancel}
                disabled={statusUpdating || cancelUpdating}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </>
        ) : (
          <span className="text-xs text-gray-400">
            {order.orderStatus === 'cancelled'
              ? 'Order was cancelled.'
              : 'Order completed.'}
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500">
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

function getItemName(item: OrderHistoryItem) {
  if (item.name) return item.name;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.name ?? 'Product';
  }
  return 'Product';
}

function getItemImage(item: OrderHistoryItem) {
  if (item.imageUrl) return item.imageUrl;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.imageUrl;
  }
  return undefined;
}

function money(value: number) {
  return `₱${(Number.isFinite(value) ? value : 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}