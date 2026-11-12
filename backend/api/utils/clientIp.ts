import type {Request} from 'express';

/**
 * Best-effort real client IP.
 *
 * Requests reach the backend through the Next.js `/api` rewrite and Vercel's
 * edge, so the TCP peer is a proxy, not the customer. The original address is
 * carried in forwarding headers; we take the left-most (original client) entry.
 * Vercel's edge overwrites these headers on incoming requests, so a client
 * cannot simply forge them.
 */
export function getClientIp(req: Request): string {
  const header = (name: string) => {
    const v = req.headers[name];
    return Array.isArray(v) ? v[0] : v;
  };
  const firstOf = (v?: string) => v?.split(',')[0]?.trim() || undefined;

  const ip =
    firstOf(header('x-vercel-forwarded-for')) ||
    firstOf(header('x-forwarded-for')) ||
    firstOf(header('x-real-ip')) ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  return ip.replace(/^::ffff:/, '');
}
