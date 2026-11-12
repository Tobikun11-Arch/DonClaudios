import rateLimit from 'express-rate-limit';
import {getClientIp} from '../utils/clientIp';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 15,                  
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

export const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

export const guestOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

// Keyed by IP like the other limiters, so the ceiling is generous enough for
// several walk-in customers sharing one network. It only exists to stop a
// single source from spamming submissions.
export const reviewLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Guests sending follow-up messages on their order page (no login). Enough for
// a real conversation, low enough to stop spam.
export const guestMessageLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Burst limit on guest checkout itself (POST /orders/guest). Counts failed
// attempts too, so a script hammering the endpoint is cut off quickly. The
// real per-IP / per-phone order caps live in guestOrderGuard.service.ts.
export const guestOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => getClientIp(req),
  message: {
    success: false,
    code: 'GUEST_ORDER_RATE_LIMIT',
    message: 'Too many checkout attempts. Please wait a few minutes and try again.'
  }
});

// Support chat messages (guests and customers). Stops one source from flooding
// the inquiry queue while leaving room for a normal back-and-forth.
export const supportMessageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => getClientIp(req),
  message: {
    success: false,
    code: 'SUPPORT_RATE_LIMIT',
    message: 'You are sending messages too quickly. Please wait a moment.'
  }
});

// Starting / re-opening a support chat (guest identity form). Low ceiling: a
// real person submits this once or twice.
export const supportStartLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => getClientIp(req),
  message: {
    success: false,
    code: 'SUPPORT_RATE_LIMIT',
    message: 'Too many attempts to start a chat. Please wait a few minutes.'
  }
});
