'use client';

import {useMemo, useState} from 'react';
import Link from 'next/link';
import {CalendarClock, Loader2, RotateCcw} from 'lucide-react';
import OrderHistorySection, {
  type HistoryRange
} from '@/features/order/components/OrderHistorySection';
import CustomerOrderFollowUp from '@/features/order/components/CustomerOrderFollowUp';
import {useMyOrdersQuery} from '@/lib/hooks/orders/useCustomerOrder';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import {useScrollToHighlight} from '@/shared/hooks/useScrollToHighlight';
import {canReorder, useReorder} from '@/lib/hooks/cart/useReorder';
import {useOpenPreOrders} from '@/lib/hooks/preorders/usePreOrders';

function isWithinRange(order: OrderHistoryEntry, range: HistoryRange) {
  if (!order.createdAt) return false;
  const createdAt = new Date(order.createdAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === 'today') return createdAt >= startOfToday;

  const cutoff = new Date(startOfToday);
  if (range === '7days') {
    cutoff.setDate(cutoff.getDate() - 6);
  } else {
    cutoff.setMonth(cutoff.getMonth() - 1);
  }
  return createdAt >= cutoff;
}

export default function HistorySlot() {
  const [range, setRange] = useState<HistoryRange>('today');
  const ordersQuery = useMyOrdersQuery();
  const {highlightId, isOpenChat} = useScrollToHighlight();
  const {reorder, pendingOrderId} = useReorder();
  const openPreOrders = useOpenPreOrders();
  const openEventIds = useMemo(
    () => new Set((openPreOrders.data ?? []).map(e => e._id)),
    [openPreOrders.data]
  );

  const renderActions = (order: OrderHistoryEntry) => {
    // Dated pre-orders are tied to a pickup date and slot, so they are never
    // re-added to the cart. Link to that date's booking page while it is open.
    if (order.isPreOrder) {
      const eventId = order.preOrder?.eventId;
      if (!eventId || !openEventIds.has(eventId)) return null;
      return (
        <Link
          href={`/customer/dashboard/preorder/${eventId}`}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-purple-700 ring-1 ring-inset ring-purple-200 transition hover:bg-purple-50 dark:text-purple-300 dark:ring-purple-500/30 dark:hover:bg-purple-500/10"
        >
          <CalendarClock size={14} aria-hidden />
          Pre-order this date again
        </Link>
      );
    }
    if (!canReorder(order)) return null;
    const pending = pendingOrderId === order._id;
    return (
      <button
        type="button"
        onClick={() => reorder(order)}
        disabled={pendingOrderId !== null}
        aria-busy={pending}
        className="inline-flex items-center gap-1.5 rounded-full bg-[#2d4a35] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#4a7c59] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#7ed4a0] dark:text-[#1b2e21] dark:hover:bg-[#9be3b6]"
      >
        {pending ? (
          <Loader2 size={14} className="animate-spin" aria-hidden />
        ) : (
          <RotateCcw size={14} aria-hidden />
        )}
        {pending ? 'Adding to cart…' : 'Order again'}
      </button>
    );
  };

  const orders = useMemo(
    () => (ordersQuery.data?.orders ?? []).filter(order => isWithinRange(order, range)),
    [ordersQuery.data, range]
  );

  const highlightedOrder = (ordersQuery.data?.orders ?? []).find(
    o => o._id === highlightId
  );
  if (
    highlightId &&
    highlightedOrder &&
    !isWithinRange(highlightedOrder, range) &&
    range !== 'month'
  ) {
    setRange('month');
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <OrderHistorySection
        orders={orders}
        title="Order History"
        description="Track active orders, review receipts, and reorder your favorites."
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        activeRange={range}
        onRangeChange={setRange}
        renderActions={renderActions}
        emptyAction={{href: '/customer/dashboard?tab=order', label: 'Browse the menu'}}
        renderFollowUp={(order, openChat) => (
          <CustomerOrderFollowUp order={order} defaultOpen={openChat} />
        )}
        highlightOrderId={highlightId}
        openChatOrderId={isOpenChat ? highlightId : null}
      />
    </div>
  );
}