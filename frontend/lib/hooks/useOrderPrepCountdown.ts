import {useSyncExternalStore} from 'react';
import type {OrderPrepTiming} from '@/lib/api/orderApi';

/** Must match OVERDUE_GRACE_MINUTES on the backend. */
export const OVERDUE_GRACE_MINUTES = 5;

const CLOCK_INTERVAL_MS = 15_000;

type Listener = () => void;

const listeners = new Set<Listener>();
let now = Date.now();

function refresh() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  const id = setInterval(refresh, CLOCK_INTERVAL_MS);
  return () => {
    listeners.delete(listener);
    clearInterval(id);
  };
}

const NOOP_SUBSCRIBE = () => () => {};

function getSnapshot() {
  return now;
}

/**
 * A single shared clock so every visible countdown stays in step. The snapshot
 * is only reassigned by the interval, which keeps it referentially stable and
 * lets us derive the remaining minutes during render instead of mirroring
 * `Date.now()` into state.
 */
function useClock(dueAt: string | null) {
  return useSyncExternalStore(
    dueAt ? subscribe : NOOP_SUBSCRIBE,
    getSnapshot,
    getSnapshot
  );
}

/**
 * Recomputes minutes remaining against the server-provided dueAt rather than
 * counting down locally, so a backgrounded tab or a slow socket can't drift.
 */
export function useOrderPrepCountdown(timing?: OrderPrepTiming) {
  const dueAt = timing?.dueAt ?? null;
  const serverRemaining = timing?.minutesRemaining ?? null;
  const estimate = timing?.estimatedPrepMinutes ?? null;
  const isRunning = Boolean(timing?.isRunning);
  const clock = useClock(dueAt);

  const remaining = dueAt
    ? Math.ceil((new Date(dueAt).getTime() - clock) / 60_000)
    : serverRemaining;

  const isOverdue =
    Boolean(timing?.isOverdue) ||
    (isRunning && remaining !== null && remaining <= 0);

  return {
    estimate,
    remaining,
    isRunning,
    isOverdue,
    hasEstimate: estimate !== null && estimate > 0
  };
}

export function formatMinutes(minutes: number) {
  return minutes === 1 ? '1 min' : `${minutes} mins`;
}
