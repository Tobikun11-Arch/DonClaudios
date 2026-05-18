'use client';

import type {OrderHistoryEntry} from '@/lib/api/orderApi';

const GUEST_ORDER_HISTORY_KEY = 'donclaudios_guest_order_history';

function readStoredOrders() {
  if (typeof window === 'undefined') return [] as OrderHistoryEntry[];

  try {
    const raw = window.localStorage.getItem(GUEST_ORDER_HISTORY_KEY);
    if (!raw) return [] as OrderHistoryEntry[];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OrderHistoryEntry[]) : [];
  } catch {
    return [] as OrderHistoryEntry[];
  }
}

export function getGuestOrderHistory() {
  return readStoredOrders();
}

export function saveGuestOrderHistoryEntry(order: OrderHistoryEntry) {
  if (typeof window === 'undefined') return;

  const current = readStoredOrders();
  const next = [order, ...current.filter(item => item._id !== order._id)];
  window.localStorage.setItem(GUEST_ORDER_HISTORY_KEY, JSON.stringify(next));
}
