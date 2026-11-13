'use client';

import {useMemo, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import Image from 'next/image';
import {toast} from 'sonner';
import {MessageCircle, Package, ChevronRight, ChevronDown, ChevronUp, User, Phone, MapPin, Clock, Globe, Store} from 'lucide-react';
import {useScrollToHighlight} from '@/shared/hooks/useScrollToHighlight';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import CashierNotificationBell from '@/features/cashier/notifications/components/CashierNotificationBell';
import {Modal} from '@/features/owner/cashiers/components/Modal';
import {Button} from '@/components/ui/button';
import {OrderDateFilter} from './OrderDateFilter';
import type {DateRange} from './OrderDateFilter';
import {OrderPrepBadge, OrderEstimateLabel} from './OrderPrepBadge';
import {useAllOrdersQuery, useUpdateOrderStatusMutation, useSendCashierOrderMessageMutation, useMarkOnlineOrderPaidMutation} from '@/lib/hooks/orders/useCashierOrder';
import {useCounterOrdersQuery} from '@/lib/hooks/orders/useCashierCounterOrder';
import {
  useAdminOrderMessagesQuery,
  useFollowUpOrdersQuery
} from '@/lib/hooks/orders/useOrderMessage';
import type {OrderHistoryEntry, OrderHistoryItem} from '@/lib/api/orderApi';
import {cn} from '@/lib/utils';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {PreOrderBadge, withSize} from '@/shared/components/PreOrderBadge';
import {
  fulfillmentKind,
  fulfillmentLabel,
  nextStatus as nextFlowStatus,
  staffStatusLabel
} from '@/lib/orders/orderFlow';

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way',
  'completed',
  'cancelled'
] as const;

const ACTIVE_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way'
] as const;
export const ORDER_TYPES = ['delivery', 'pickup', 'reservation'] as const;
export const CANCELLABLE = ['pending', 'confirmed', 'preparing'] as const;
export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  on_the_way: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

/**
 * The status the advance button moves this order to, following the order's
 * own flow (store delivery, customer-booked courier, pick-up, reservation).
 * See `lib/orders/orderFlow.ts`; the backend rejects steps outside the flow.
 */
export function nextStatusFor(order: OrderHistoryEntry): string | null {
  return nextFlowStatus(order);
}

/** Generic label (no order known), e.g. for the status filter. */
export function formatStatus(status: string) {
  return STATUS_LABELS[status] ?? status;
}

/** Label for this order's status ("Ready for courier", "Delivered", ...). */
export function orderStatusLabel(order: OrderHistoryEntry, status: string = order.orderStatus) {
  return staffStatusLabel(order, status);
}

export function orderTypeLabel(orderType: string) {
  if (orderType === 'pickup') return 'Pickup';
  if (orderType === 'delivery') return 'Delivery';
  return 'Reservation';
}

/**
 * Order type for the card, with who delivers it so the cashier knows which
 * rider to expect: "Free delivery (our rider)" or
 * "Delivery · Grab Express (customer-booked)".
 */
export function orderKindLabel(order: OrderHistoryEntry) {
  const kind = fulfillmentKind(order);
  if (kind === 'store_delivery') return 'Free delivery (our rider)';
  if (kind === 'courier_delivery') return fulfillmentLabel(order);
  return orderTypeLabel(order.orderType);
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

/* ------------------------------------------------------------------ */
/* PAYMENT helpers (Xendit flow)                                       */
/* ------------------------------------------------------------------ */

const CHANNEL_LABELS: Record<string, string> = {
  gcash: 'GCash',
  maya: 'Maya',
  grabpay: 'GrabPay',
  shopeepay: 'ShopeePay',
  card: 'Card',
  cash: 'Cash'
};

function channelLabel(order: OrderHistoryEntry) {
  const key = order.paymentChannel ?? order.paymentMethod ?? '';
  return CHANNEL_LABELS[key] ?? 'online';
}

function balanceOf(order: OrderHistoryEntry) {
  return Math.max(0, order.totalAmount - (order.amountPaid ?? 0));
}

/** Cash the cashier must collect before completing the order, or null. */
export function cashToCollect(order: OrderHistoryEntry): number | null {
  if (order.orderSource === 'in-store' || order.orderStatus === 'cancelled') {
    return null;
  }
  if (order.paymentStatus === 'paid') return null;
  if (order.paymentChoice === 'cash_on_pickup') return order.totalAmount;
  if (order.paymentStatus === 'down_payment' && order.balanceChoice === 'cash') {
    return balanceOf(order);
  }
  return null;
}

/**
 * The small chip shown on each card header. Online orders show where the
 * Xendit payment stands; counter orders are hidden on purpose.
 */
export function paymentStatusChip(order: OrderHistoryEntry): {
  label: string;
  className: string;
} | null {
  const green = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
  const amber = 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
  const gray = 'bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  const sky = 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
  const red = 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30';

  if (order.refundStatus === 'failed') return {label: 'Refund failed', className: red};
  if (order.refundStatus === 'pending') return {label: 'Refund pending', className: sky};
  if (order.refundStatus === 'refunded') return {label: 'Refunded', className: sky};
  if (order.paymentStatus === 'paid') {
    return {
      label:
        order.paymentChoice === 'cash_on_pickup'
          ? 'Paid in cash'
          : `Paid · ${channelLabel(order)}`,
      className: green
    };
  }
  if (order.paymentStatus === 'down_payment') {
    return {
      label:
        order.balanceChoice === 'cash'
          ? 'Down payment · balance in cash'
          : order.balanceChoice === 'online'
            ? 'Down payment · balance online'
            : 'Down payment paid',
      className: amber
    };
  }
  if (order.paymentChoice === 'cash_on_pickup') {
    return {label: 'Cash on pickup', className: gray};
  }
  if (order.paymentStatus === 'unpaid' && order.orderStatus !== 'pending') {
    return {label: 'Awaiting payment', className: gray};
  }
  return null;
}

/**
 * Why the order cannot move to `next` yet, or null when it can. Mirrors the
 * backend payment gate (payment.service assertPaymentAllowsStatus) so the
 * button is disabled with a hint instead of a 409 toast.
 */
export function paymentGateReason(
  order: OrderHistoryEntry,
  next: string | null
): string | null {
  if (
    !next ||
    !['preparing', 'ready', 'on_the_way', 'completed'].includes(next) ||
    order.orderSource === 'in-store' ||
    order.orderStatus === 'completed'
  ) {
    return null;
  }
  const status = order.paymentStatus ?? 'unpaid';
  const cashPickup = order.paymentChoice === 'cash_on_pickup';

  if (next === 'preparing' || next === 'ready') {
    if (status === 'paid' || status === 'down_payment' || cashPickup) return null;
    return 'Waiting for the customer to pay online';
  }
  if (next === 'on_the_way') {
    if (status === 'paid') return null;
    return status === 'down_payment'
      ? 'Waiting for the customer to pay the balance online'
      : 'This order is not paid yet';
  }
  if (status === 'paid') return null;
  return cashToCollect(order) !== null
    ? 'Mark the cash as received first'
    : 'Waiting for the customer to pay the balance';
}

export function paymentGateBlocks(
  order: OrderHistoryEntry,
  next: string | null
): boolean {
  return paymentGateReason(order, next) !== null;
}

export function statusChipClass(status: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
    case 'confirmed':
      return 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
    case 'preparing':
      return 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
    case 'ready':
      return 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30';
    case 'on_the_way':
      return 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30';
    case 'completed':
      return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    case 'cancelled':
      return 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30';
    default:
      return 'bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700';
  }
}

export function CashierOrders() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>(() => ({from: null, to: null}));
  // No date range: the server sends only the live queue (active orders + last
  // 7 days). Picking a range fetches that range, so older orders stay reachable.
  const {data: allData, isLoading: allLoading, isError: allError} = useAllOrdersQuery(dateRange);
  const {data: counterData, isLoading: counterLoading, isError: counterError} = useCounterOrdersQuery();
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const [manualFilter, setManualFilter] = useState<{key: string | null; value: string}>({
    key: null,
    value: 'all'
  });
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [cancellingOrder, setCancellingOrder] = useState<OrderHistoryEntry | null>(null);
  const orderSourceTab: 'online' | 'walk-in' =
    searchParams.get('source') === 'walk-in' ? 'walk-in' : 'online';

  const allOrders = useMemo(() => allData?.orders ?? [], [allData?.orders]);
  const counterOrders = useMemo(
    () => (counterData?.orders ?? []) as OrderHistoryEntry[],
    [counterData?.orders]
  );

  const isLoading = orderSourceTab === 'walk-in' ? counterLoading : allLoading;
  const isError = orderSourceTab === 'walk-in' ? counterError : allError;

  // The active tab's source list. Walk-in data comes from the counter endpoint
  // (in-store orders are deliberately excluded from /orders/all).
  const orders = useMemo(
    () => (orderSourceTab === 'walk-in' ? counterOrders : allOrders),
    [orderSourceTab, counterOrders, allOrders]
  );

  // Filter orders by source (already source-specific; kept for compatibility)
  const filteredBySource = orders;
  // Message count + "awaiting reply" per order, for the Follow-up button.
  const followUpQuery = useFollowUpOrdersQuery();
  const followUpByOrder = useMemo(() => {
    const map = new Map<string, {count: number; awaitingReply: boolean}>();
    for (const f of followUpQuery.data?.orders ?? []) {
      map.set(f.orderId, {
        count: f.messageCount,
        awaitingReply: f.lastAuthorType === 'customer'
      });
    }
    return map;
  }, [followUpQuery.data]);
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
    if (dateRange.from === null && dateRange.to === null) return filteredBySource;
    const {from, to} = dateRange;
    return filteredBySource.filter(order => {
      const ts = new Date(order.createdAt ?? '').getTime();
      if (Number.isNaN(ts)) return false;
      if (from !== null && ts < from) return false;
      if (to !== null && ts > to) return false;
      return true;
    });
  }, [filteredBySource, dateRange]);

  const visibleOrders = useMemo(() => {
    let base: OrderHistoryEntry[];
    if (orderSourceTab === 'walk-in') {
      base =
        statusFilter === 'all'
          ? ordersInRange
          : statusFilter === 'paid'
            ? ordersInRange.filter(o => o.paymentStatus === 'paid')
            : ordersInRange.filter(o => o.paymentStatus !== 'paid');
    } else {
      base =
        statusFilter === 'all'
          ? ordersInRange
          : statusFilter === 'overdue'
            ? ordersInRange.filter(o => o.prepTiming?.isOverdue)
            : statusFilter === 'active'
              ? ordersInRange.filter(o =>
                  ACTIVE_STATUSES.includes(
                    o.orderStatus as (typeof ACTIVE_STATUSES)[number]
                  )
                )
              : ordersInRange.filter(o => o.orderStatus === statusFilter);
    }
    if (orderSourceTab === 'walk-in') return base;
    if (orderTypeFilter === 'all') return base;
    return base.filter(o => o.orderType === orderTypeFilter);
  }, [ordersInRange, statusFilter, orderTypeFilter, orderSourceTab]);

  const handleNextStatus = async (order: OrderHistoryEntry) => {
    const next = nextStatusFor(order);
    if (!next) return;
    try {
      await updateStatusMutation.mutateAsync({orderId: order._id, status: next});
      toast.success(`Order marked as ${orderStatusLabel(order, next)}.`);
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to update status.')
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
        getFriendlyErrorMessage(error, 'Failed to cancel order.')
      );
    }
  };

  const countFor = (status: string) => {
    if (orderSourceTab === 'walk-in') {
      if (status === 'all') return ordersInRange.length;
      if (status === 'paid')
        return ordersInRange.filter(o => o.paymentStatus === 'paid').length;
      if (status === 'unpaid')
        return ordersInRange.filter(o => o.paymentStatus !== 'paid').length;
      return 0;
    }
    return status === 'active'
      ? ordersInRange.filter(o =>
          ACTIVE_STATUSES.includes(o.orderStatus as (typeof ACTIVE_STATUSES)[number])
        ).length
      : status === 'all'
        ? ordersInRange.length
        : ordersInRange.filter(o => o.orderStatus === status).length;
  };

  const typeCountFor = (type: string) =>
    type === 'all'
      ? ordersInRange.length
      : ordersInRange.filter(o => o.orderType === type).length;

  const overdueCount = useMemo(
    () => ordersInRange.filter(o => o.prepTiming?.isOverdue).length,
    [ordersInRange]
  );

  // Count for each tab
  const onlineCount = useMemo(() => allOrders.length, [allOrders]);
  const walkInCount = useMemo(() => counterOrders.length, [counterOrders]);

  const handleTabChange = (tab: 'online' | 'walk-in') => {
    // Reset type filter when switching to walk-in since it doesn't apply
    if (tab === 'walk-in') {
      setOrderTypeFilter('all');
    }
    // Update URL without full page reload using Next.js router
    const params = new URLSearchParams(searchParams.toString());
    params.set('source', tab);
    router.replace(`/cashier/dashboard?${params.toString()}`, {scroll: false});
  };

  const statusFilterOptions =
    orderSourceTab === 'walk-in'
      ? ['paid', 'unpaid', 'all']
      : ['overdue', 'active', ...ORDER_STATUSES, 'all'];
  const filterLabel = (f: string) => {
    if (f === 'overdue') return 'Overdue';
    if (f === 'active') return 'Active';
    if (f === 'paid') return 'Paid';
    if (f === 'unpaid') return 'Unpaid';
    if (f === 'all') return 'All';
    return formatStatus(f);
  };
  const filterCount = (f: string) =>
    f === 'overdue' ? overdueCount : countFor(f);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#2d4a35] dark:text-[#7ed4a0]">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Update orders as they progress and reply to follow-ups.
          </p>
        </div>
        <CashierNotificationBell />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
          <div className={cn('relative w-full sm:w-auto', orderSourceTab !== 'online' && 'col-span-2')}>
            <select
              id="order-status-filter"
              aria-label="Filter by status"
              value={statusFilter}
              onChange={e => handleStatusFilterChange(e.target.value)}
              className="min-h-[44px] w-full appearance-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-4 pr-10 text-sm font-semibold text-[#2d4a35] dark:text-[#7ed4a0] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:border-[#2d4a35] dark:focus:border-[#7ed4a0]/60 focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20 sm:w-auto"
            >
              {statusFilterOptions.map(f => (
                <option key={f} value={f}>
                  {filterLabel(f)} ({filterCount(f)})
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            />
          </div>
          {orderSourceTab === 'online' && (
            <div className="relative w-full sm:w-auto">
              <select
                id="order-type-filter"
                aria-label="Filter by order type"
                value={orderTypeFilter}
                onChange={e => setOrderTypeFilter(e.target.value)}
                className="min-h-[44px] w-full appearance-none rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-4 pr-10 text-sm font-semibold text-[#2d4a35] dark:text-[#7ed4a0] transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 focus:border-[#2d4a35] dark:focus:border-[#7ed4a0]/60 focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20 sm:w-auto"
              >
                <option value="all">All types ({typeCountFor('all')})</option>
                {ORDER_TYPES.map(t => (
                  <option key={t} value={t}>
                    {orderTypeLabel(t)} ({typeCountFor(t)})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              />
            </div>
          )}
          <div className="col-span-2 sm:col-span-1">
            <OrderDateFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Order source"
          className="order-first grid w-full shrink-0 grid-cols-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-1 sm:order-none sm:flex sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={orderSourceTab === 'online'}
            aria-controls="orders-list"
            onClick={() => handleTabChange('online')}
            className={cn(
              'flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-0',
              orderSourceTab === 'online'
                ? 'bg-[#2d4a35] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            )}
          >
            <Globe size={14} />
            Online
            <span className="ml-0.5 opacity-70">({onlineCount})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={orderSourceTab === 'walk-in'}
            aria-controls="orders-list"
            onClick={() => handleTabChange('walk-in')}
            className={cn(
              'flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:min-h-0',
              orderSourceTab === 'walk-in'
                ? 'bg-[#2d4a35] text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
            )}
          >
            <Store size={14} />
            Walk-in
            <span className="ml-0.5 opacity-70">({walkInCount})</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-5 text-sm text-gray-500 dark:text-gray-400">
          Loading orders...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-5 text-sm text-red-600 dark:text-red-400">
          Failed to load orders.
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-gray-900 shadow p-10 text-center">
          <Package className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {orderSourceTab === 'walk-in'
              ? 'No walk-in orders yet.'
              : dateRange.from !== null || dateRange.to !== null
                ? 'No orders match these filters within the selected date range.'
                : 'No orders match these filters.'}
          </p>
          {orderSourceTab === 'online' && dateRange.from === null && dateRange.to === null && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Showing active orders and the last 7 days. Pick a date range to see older orders.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map(order => (
            <div key={order._id} id={`order-${order._id}`}>
              <OrderCard
                order={order}
                followUp={followUpByOrder.get(order._id)}
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
          {orderSourceTab === 'online' && dateRange.from === null && dateRange.to === null && (
            <p className="pt-1 text-center text-xs text-gray-400 dark:text-gray-500">
              Showing active orders and the last 7 days. Pick a date range to see older orders.
            </p>
          )}
        </div>
      )}

      <Modal
        open={!!cancellingOrder}
        title="Cancel order"
        onClose={() => setCancellingOrder(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to cancel order{' '}
            <span className="font-bold text-gray-900 dark:text-gray-100">
              #
              {cancellingOrder
                ? String(cancellingOrder._id).slice(-6).toUpperCase()
                : ''}
            </span>{' '}
            from{' '}
            <span className="font-bold text-gray-900 dark:text-gray-100">
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
  followUp,
  expanded,
  onToggle,
  onNextStatus,
  onCancel,
  statusUpdating,
  cancelUpdating
}: {
  order: OrderHistoryEntry;
  /** Messages on this order, if any (from the follow-up summary). */
  followUp?: {count: number; awaitingReply: boolean};
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

  const isWalkIn = order.orderSource === 'in-store';
  const nextStatus = nextStatusFor(order);
  const canAdvance = nextStatus !== null;
  const paymentReason = paymentGateReason(order, nextStatus);
  const paymentBlocked = paymentReason !== null;

  const handleSend = async (text: string) => {
    try {
      await sendMutation.mutateAsync({orderId: order._id, body: text});
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to send reply.')
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
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow">
      <div
        onClick={() => setDetailsOpen(prev => !prev)}
        className="w-full cursor-pointer select-none p-5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800/60">
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
              <span className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-gray-800/60" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                {customerDisplay(order)}
              </p>
              {order.orderSource === 'in-store' ? (
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    order.paymentStatus === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200'
                  }`}
                >
                  {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              ) : (
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusChipClass(order.orderStatus)}`}
                >
                  {orderStatusLabel(order)}
                </span>
              )}
              {!isWalkIn && (
                <OrderPrepBadge
                  timing={order.prepTiming}
                  orderType={order.orderType}
                />
              )}
              {!isWalkIn &&
                (() => {
                  const chip = paymentStatusChip(order);
                  return chip ? (
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${chip.className}`}
                    >
                      {chip.label}
                    </span>
                  ) : null;
                })()}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {isWalkIn && order.orderNumber
                ? `Order ${order.orderNumber}`
                : `Order #${String(order._id).slice(-6).toUpperCase()}`}
              {!isWalkIn && ` • ${orderKindLabel(order)}`}
              {' • '}₱{order.totalAmount}.00
              <PreOrderBadge order={order} className="ml-2" />
              {order.isGuest && (
                <span className="ml-2 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  GUEST
                </span>
              )}
            </p>
            {order.createdAt && (
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            )}
            {order.prepTiming?.isOverdue && (
              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                Started preparing{' '}
                {order.prepTiming.preparingAt
                  ? new Date(order.prepTiming.preparingAt).toLocaleTimeString()
                  : 'earlier'}
                .
              </p>
            )}
          </div>

          <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:shrink-0">
            {!isWalkIn && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onToggle();
                }}
                aria-label={
                  followUp?.awaitingReply
                    ? `Follow-up: customer is waiting for a reply (${followUp.count} messages)`
                    : 'Follow-up messages'
                }
                className={cn(
                  'relative flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors',
                  followUp?.awaitingReply
                    ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/60'
                )}
              >
                <MessageCircle size={14} />
                {followUp?.awaitingReply ? 'Reply' : 'Follow-up'}
                {followUp?.count ? (
                  <span
                    className={cn(
                      'grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold',
                      followUp.awaitingReply
                        ? 'bg-[#c30010] text-white'
                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                    )}
                  >
                    {followUp.count}
                  </span>
                ) : null}
                <ChevronRight
                  size={14}
                  className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>
            )}
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
        <div className="border-t border-gray-100 dark:border-gray-700 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
              <User size={16} className="shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {order.guestInfo
                  ? `${order.guestInfo.firstName} ${order.guestInfo.lastName}`
                  : customerDisplay(order)}
              </span>
            </div>
            {order.guestInfo?.phoneNumber &&
              order.guestInfo.phoneNumber !== 'n/a' && (
                <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                  <Phone size={16} className="shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {order.guestInfo.phoneNumber}
                  </span>
                </div>
              )}
            {order.guestInfo?.address && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 dark:border-gray-700 p-3 sm:col-span-2">
                <MapPin size={16} className="shrink-0 text-[#2d4a35] dark:text-[#7ed4a0]" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {order.guestInfo.address}
                </span>
              </div>
            )}
          </div>

          {order.riderNotes && (
            <div className="mt-3 rounded-xl border border-amber-100 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Rider / Notes
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200">{order.riderNotes}</p>
            </div>
          )}

          {order.paymentMethod === 'cash' && order.changeFor ? (
            <div className="mt-3 rounded-xl border border-teal-100 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 p-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                Change for
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {order.changeFor}
              </p>
            </div>
          ) : null}

          <OrderPaymentPanel order={order} />

          <div className="mt-4">
            <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-gray-100">
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
                    className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-700 p-3"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-800/60">
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
                      <p className="line-clamp-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                        {getItemName(item)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Qty {item.quantity} • {money(item.price)} each
                        {item.prepTimeMinutes != null && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <Clock size={9} />~{item.prepTimeMinutes} min
                          </span>
                        )}
                      </p>
                      {item.prepTimeMinutes != null &&
                        order.prepTiming?.estimatedPrepMinutes != null &&
                        item.prepTimeMinutes ===
                          order.prepTiming.estimatedPrepMinutes && (
                          <p className="mt-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            Slowest item — sets the order estimate
                          </p>
                        )}
                      {item.specialRequest && (
                        <p className="mt-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 px-2 py-1 text-xs text-orange-700 dark:text-orange-300">
                          Request: {item.specialRequest}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-900 dark:text-gray-100">
                      {money(item.price * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 space-y-1 rounded-xl bg-gray-50 dark:bg-gray-800/60 p-4 text-sm text-gray-600 dark:text-gray-300">
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
              <div className="mt-2 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                  {money(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-700 px-5 py-4">
        {canAdvance ? (
          <>
            <button
              onClick={onNextStatus}
              disabled={
                statusUpdating || cancelUpdating || paymentBlocked
              }
              title={paymentReason ?? undefined}
              className="min-h-[40px] rounded-xl bg-[#2d4a35] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#3a5c44] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {statusUpdating
                ? 'Updating...'
                : `Mark ${orderStatusLabel(order, nextStatus)}`}
            </button>
            {paymentBlocked ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {paymentReason}
              </span>
            ) : null}
            {CANCELLABLE.includes(order.orderStatus as (typeof CANCELLABLE)[number]) && (
              <button
                onClick={onCancel}
                disabled={statusUpdating || cancelUpdating}
                className="min-h-[40px] rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50"
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

      {expanded && !isWalkIn && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Conversation with {customerDisplay(order)}
          </p>
          {messagesQuery.isLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading conversation...</div>
          ) : messagesQuery.isError ? (
            <div className="text-sm text-red-600 dark:text-red-400">
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
  let name = 'Product';
  if (item.name) name = item.name;
  else if (item.productId && typeof item.productId === 'object') {
    name = item.productId.name ?? 'Product';
  }
  return withSize(name, item.sizeLabel);
}

/**
 * PAYMENT panel (cashier side). Xendit confirms online payments by itself, so
 * there is nothing to verify: this shows where the payment stands and offers
 * "Cash received" when cash is due (cash on pickup, or a cash balance).
 */
export function OrderPaymentPanel({order}: {order: OrderHistoryEntry}) {
  const markPaid = useMarkOnlineOrderPaidMutation();

  if (order.orderSource === 'in-store') return null;
  if (order.orderStatus === 'pending') return null;

  const chip = paymentStatusChip(order);
  const cashDue = cashToCollect(order);
  const amountPaid = order.amountPaid ?? 0;
  const fee = order.transactionFee ?? 0;
  const expiresAt =
    order.paymentStatus === 'unpaid' && order.paymentExpiresAt
      ? new Date(order.paymentExpiresAt)
      : null;

  const handleCashReceived = async () => {
    try {
      await markPaid.mutateAsync(order._id);
      toast.success('Cash payment recorded.');
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to record the cash payment.')
      );
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Payment
        </p>
        {chip ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${chip.className}`}
          >
            {chip.label}
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-200">
        <p>
          Order total <span className="font-semibold">{money(order.totalAmount)}</span>
          {amountPaid > 0 ? (
            <>
              {' '}&middot; paid <span className="font-semibold">{money(amountPaid)}</span>
            </>
          ) : null}
        </p>
        {fee > 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Customer also paid {money(fee)} transaction fee (not part of sales).
          </p>
        ) : null}
        {expiresAt && order.paymentChoice !== 'cash_on_pickup' ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Payment link expires{' '}
            {expiresAt.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit'})}.
            Unpaid orders are cancelled automatically.
          </p>
        ) : null}
        {order.refundStatus === 'failed' ? (
          <p className="text-xs font-semibold text-red-600 dark:text-red-400">
            Automatic refund failed. The owner must refund this customer from the Xendit dashboard.
          </p>
        ) : null}
      </div>

      {cashDue !== null ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={markPaid.isPending}
            onClick={handleCashReceived}
          >
            {markPaid.isPending ? 'Saving...' : `Cash received (${money(cashDue)})`}
          </Button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Click once the customer has paid at the store.
          </span>
        </div>
      ) : null}
    </div>
  );
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