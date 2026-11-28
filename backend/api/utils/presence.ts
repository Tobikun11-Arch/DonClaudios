/**
 * Cashier Online/Offline. Any request a signed-in cashier makes updates
 * lastSeenAt (at most once per PRESENCE_TOUCH_MS, see requireAuth). The web
 * cashier and the POS app already poll every 20-30s while open, so no extra
 * heartbeat traffic is needed. Sign-in sets it, sign-out clears it. A
 * cashier is online while lastSeenAt is newer than PRESENCE_TIMEOUT_MS, so a
 * closed or killed app goes offline on its own.
 */
export const PRESENCE_TIMEOUT_MS = 3 * 60 * 1000;

/** How often a cashier's requests may rewrite lastSeenAt (well under the timeout). */
export const PRESENCE_TOUCH_MS = 60 * 1000;

export function isOnline(lastSeenAt?: Date | string | null, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  return now - new Date(lastSeenAt).getTime() < PRESENCE_TIMEOUT_MS;
}

/** Mongo filter for cashiers whose last beat is inside the timeout. */
export function onlineSinceFilter(now = Date.now()) {
  return {lastSeenAt: {$gt: new Date(now - PRESENCE_TIMEOUT_MS)}};
}
