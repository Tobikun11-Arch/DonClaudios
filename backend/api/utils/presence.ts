/**
 * Cashier Online/Offline. The cashier apps (Expo POS and web cashier) call
 * POST /api/auth/heartbeat on sign-in, on app open and every minute while
 * open; sign-out clears it. A cashier is online while the last beat is
 * newer than PRESENCE_TIMEOUT_MS, so a killed app goes offline on its own.
 */
export const PRESENCE_TIMEOUT_MS = 3 * 60 * 1000;

export function isOnline(lastSeenAt?: Date | string | null, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  return now - new Date(lastSeenAt).getTime() < PRESENCE_TIMEOUT_MS;
}

/** Mongo filter for cashiers whose last beat is inside the timeout. */
export function onlineSinceFilter(now = Date.now()) {
  return {lastSeenAt: {$gt: new Date(now - PRESENCE_TIMEOUT_MS)}};
}
