// Anti-spam limits for GUEST checkout (POST /orders/guest). Account customers
// are not affected. Every number here is enforced server-side by
// services/guestOrderGuard.service.ts; the frontend only adds a honeypot and a
// form timer.
//
// The limits are generous enough for a family or office sharing one Wi-Fi
// (several real guests behind the same IP) and tight enough that one person or
// bot cannot flood the cashier queue with fake orders.

export const GUEST_ORDER_GUARD = {
  /** Seconds a single IP must wait between two successful guest orders. */
  ipCooldownSeconds: 60,
  /** Max guest orders from one IP in a rolling hour. */
  ipMaxPerHour: 5,
  /** Max guest orders from one IP in a rolling 24 hours. */
  ipMaxPerDay: 15,

  /** Max guest orders for one phone number / email in a rolling 24 hours. */
  contactMaxPerDay: 5,
  /** Max guest orders for one phone / email that are still in progress. */
  contactMaxActive: 2,

  /** Same contact + same items again within this many minutes = duplicate. */
  duplicateWindowMinutes: 10,

  /**
   * A real person needs time to fill in name, number, OTP and address. A form
   * submitted faster than this is treated as a bot. Only checked when the
   * client sends `formStartedAt`.
   */
  minFormFillSeconds: 4,

  /** Burst limit on the endpoint itself (counts failed attempts too). */
  burstWindowMinutes: 10,
  burstMaxRequests: 10,

  /** How long attempt logs are kept (MongoDB TTL). */
  attemptLogHours: 48
} as const;

/** Order statuses that count as "still in progress" for contactMaxActive. */
export const ACTIVE_GUEST_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'on_the_way'
] as const;
