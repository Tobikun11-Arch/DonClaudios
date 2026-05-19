'use client';

import {useState} from 'react';
import OrderHistorySection from '@/features/order/components/OrderHistorySection';
import {getGuestOrderHistory} from '@/lib/orders/orderHistoryStorage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

export default function GuestOrderHistoryPage() {
  const [guestOrders] = useState<OrderHistoryEntry[]>(() =>
    getGuestOrderHistory()
  );

  return (
    <main className="min-h-screen bg-gray-50 pt-28 pb-12">
      <OrderHistorySection
        orders={guestOrders}
        title="Order History"
        description="Guest orders saved on this browser."
      />
    </main>
  );
}
