// Anti-spam limits for ACCOUNT checkout (POST /orders/me). Guests have their
// own, stricter set in guestOrderGuard.ts. Every number here is enforced
// server-side by services/customerOrderGuard.service.ts.
//
// Account customers already passed email / phone verification to sign in, so
// the limits are looser than the guest ones. They exist so one account (or a
// script holding its session) cannot flood the cashier queue.

export const CUSTOMER_ORDER_GUARD = {
  /** Seconds an account must wait between two placed orders. */
  cooldownSeconds: 60,
  /** Max orders one account may place in a rolling 24 hours. */
  maxPerDay: 10,
  /** Max orders one account may have still in progress at once. */
  maxActive: 3,

  /** Same account + same items again within this many minutes = duplicate. */
  duplicateWindowMinutes: 10,

  /** Burst limit on the endpoint itself, keyed by account (counts failures). */
  burstWindowMinutes: 10,
  burstMaxRequests: 10,

  /**
   * Suspicious account: this many blocked attempts inside strikeWindowMinutes
   * puts a temporary order block on the account for blockHours.
   */
  strikeLimit: 6,
  strikeWindowMinutes: 30,
  blockHours: 12,

  /** How long attempt logs are kept (MongoDB TTL). */
  attemptLogHours: 48
} as const;
