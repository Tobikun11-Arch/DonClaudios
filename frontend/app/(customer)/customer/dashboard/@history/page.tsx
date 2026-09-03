'use client';

import {useMemo, useState} from 'react';
import OrderHistorySection, {
  type HistoryRange
} from '@/features/order/components/OrderHistorySection';
import CustomerOrderFollowUp from '@/features/order/components/CustomerOrderFollowUp';
import {useMyOrdersQuery} from '@/lib/hooks/orders/useCustomerOrder';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

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

  const orders = useMemo(
    () => (ordersQuery.data?.orders ?? []).filter(order => isWithinRange(order, range)),
    [ordersQuery.data, range]
  );

  return (
    <div className="w-full max-w-6xl mx-auto">
      <OrderHistorySection
        orders={orders}
        title="Order History"
        description="Your previous account orders."
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
        activeRange={range}
        onRangeChange={setRange}
        renderFollowUp={order => <CustomerOrderFollowUp order={order} />}
      />
    </div>
  );
}