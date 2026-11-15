'use client';

import {useSyncExternalStore} from 'react';
import type {PaymentMethod} from '@/features/cashier/counter/counterShared';

/**
 * Cashier preferences for THIS device (the counter tablet or PC), kept in
 * localStorage: they follow the till, not the account, and cost no requests.
 */
export interface CashierPrefs {
  /** Payment method pre-selected on every new counter ticket. */
  defaultPayment: PaymentMethod;
  /** Chime for new orders and other bell notifications. */
  orderSound: boolean;
  /** Sound when a customer is waiting in support chat. */
  chatSound: boolean;
}

export const DEFAULT_CASHIER_PREFS: CashierPrefs = {
  defaultPayment: 'cash',
  orderSound: true,
  chatSound: true
};

const KEY = 'dc:cashier-prefs';
const listeners = new Set<() => void>();
let cache: CashierPrefs | null = null;

function read(): CashierPrefs {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = {...DEFAULT_CASHIER_PREFS, ...(raw ? JSON.parse(raw) : {})};
  } catch {
    cache = DEFAULT_CASHIER_PREFS;
  }
  return cache!;
}

export function setCashierPrefs(patch: Partial<CashierPrefs>) {
  cache = {...read(), ...patch};
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Private mode / storage blocked: keep it for this session only.
  }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Hydration-safe: the server render (and first client paint) use the defaults. */
export function useCashierPrefs(): CashierPrefs {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_CASHIER_PREFS);
}
