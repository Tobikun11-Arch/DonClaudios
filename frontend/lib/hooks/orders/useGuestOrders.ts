'use client';

import {useEffect, useState} from 'react';
import {getTrackedOrder} from '@/lib/api/orderApi';
import {
  getGuestOrderHistory,
  subscribeGuestOrderHistory,
  updateGuestOrderHistoryEntry
} from '@/lib/orders/orderHistoryStorage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

const TERMINAL_STATUSES = ['completed', 'cancelled'];
const SYNC_INTERVAL_MS = 10_000;

export function useGuestOrders() {
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeGuestOrderHistory(() =>
      setOrders(getGuestOrderHistory())
    );
    const rafId = requestAnimationFrame(() =>
      setOrders(getGuestOrderHistory())
    );
    return () => {
      unsubscribe();
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const trackable = orders.filter(
      order =>
        !TERMINAL_STATUSES.includes(order.orderStatus) &&
        !!order.guestInfo?.phoneNumber
    );
    if (trackable.length === 0) return;

    let disposed = false;

    const sync = async () => {
      const responses = await Promise.all(
        trackable.map(order =>
          getTrackedOrder(order._id, order.guestInfo?.phoneNumber).catch(
            () => null
          )
        )
      );
      if (disposed) return;
      responses.forEach(response => {
        if (response?.order) updateGuestOrderHistoryEntry(response.order);
      });
    };

    void sync();
    const timer = setInterval(sync, SYNC_INTERVAL_MS);

    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [orders]);

  return orders;
}
