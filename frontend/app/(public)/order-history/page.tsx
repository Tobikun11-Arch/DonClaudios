'use client';

import {useEffect, useState} from 'react';
import OrderHistorySection from '@/features/order/components/OrderHistorySection';
import {
  getGuestOrderHistory,
  subscribeGuestOrderHistory
} from '@/lib/orders/orderHistoryStorage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

export default function GuestOrderHistoryPage() {
  const [guestOrders, setGuestOrders] = useState<OrderHistoryEntry[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeGuestOrderHistory(() =>
      setGuestOrders(getGuestOrderHistory())
    );
    const rafId = requestAnimationFrame(() =>
      setGuestOrders(getGuestOrderHistory())
    );
    return () => {
      unsubscribe();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 pt-28 pb-12">
      <OrderHistorySection
        orders={guestOrders}
        title="Order History"
        description="Guest orders saved on this browser."
        variant="guest"
      />
    </main>
  );
}
