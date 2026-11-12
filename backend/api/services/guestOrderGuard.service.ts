import crypto from 'crypto';
import type {Request} from 'express';
import {
  ACTIVE_GUEST_ORDER_STATUSES,
  GUEST_ORDER_GUARD as G
} from '../config/guestOrderGuard';
import {GuestOrderAttemptModel} from '../models/GuestOrderAttempt.model';
import {OrderModel} from '../models/Order.model';
import {ApiError} from '../utils/error';
import {phoneVariants, toInternationalPhone} from '../utils/phone';
import {logger} from '../logging/logger';
import {getClientIp} from '../utils/clientIp';

/**
 * Spam protection for guest checkout. Layers, in order:
 *  1. Honeypot  - hidden "website" field real people never see or fill.
 *  2. Form timer - the form cannot be submitted in under a few seconds.
 *  3. Per-IP     - cooldown between orders + hourly / daily caps.
 *  4. Per-contact- daily cap and "active orders" cap per phone / email.
 *  5. Duplicate  - same contact + same cart within a short window.
 * (A burst rate limiter on the route and the existing phone/email OTP sit in
 * front of all this.)
 *
 * Every blocked attempt is logged to guest_order_attempts so the panel / owner
 * can see the protection working.
 */

export type GuestOrderGuardContext = {
  ip: string;
  phone: string | null;
  email: string | null;
  itemsHash: string;
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

export function hashItems(
  items: Array<{productId: string; quantity: number}>
): string {
  const canonical = items
    .map(i => `${i.productId}:${i.quantity}`)
    .sort()
    .join('|');
  return crypto.createHash('sha1').update(canonical).digest('hex');
}

async function block(
  ctx: GuestOrderGuardContext,
  status: number,
  code: string,
  message: string
): Promise<never> {
  logger.warn({ip: ctx.ip, phone: ctx.phone, code}, 'guest order blocked');
  await GuestOrderAttemptModel.create({
    ...ctx,
    outcome: 'blocked',
    reason: code
  }).catch(() => {});
  throw new ApiError(status, code, message);
}

export const guestOrderGuardService = {
  buildContext(
    req: Request,
    guestInfo: {phoneNumber?: string; email?: string},
    items: Array<{productId: string; quantity: number}>
  ): GuestOrderGuardContext {
    return {
      ip: getClientIp(req),
      phone: guestInfo.phoneNumber
        ? toInternationalPhone(guestInfo.phoneNumber)
        : null,
      email: guestInfo.email ? guestInfo.email.toLowerCase().trim() : null,
      itemsHash: hashItems(items)
    };
  },

  /** Cheap bot checks that need no database. Run before anything else. */
  async assertNotBot(ctx: GuestOrderGuardContext, body: any) {
    const honeypot = body?.website;
    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      // Deliberately vague: do not tell a bot which check it tripped.
      await block(ctx, 400, 'SPAM_DETECTED', 'Unable to place this order.');
    }

    const startedAt = Number(body?.formStartedAt);
    if (Number.isFinite(startedAt) && startedAt > 0) {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      if (elapsedSec >= 0 && elapsedSec < G.minFormFillSeconds) {
        await block(
          ctx,
          400,
          'SPAM_DETECTED',
          'That was too fast. Please review your order and try again.'
        );
      }
    }
  },

  /** Database-backed limits. Run after validation, before reserving stock. */
  async assertWithinLimits(ctx: GuestOrderGuardContext) {
    // ---- Per IP -----------------------------------------------------------
    const lastFromIp = await GuestOrderAttemptModel.findOne({
      ip: ctx.ip,
      outcome: 'placed'
    })
      .sort({createdAt: -1})
      .lean();
    if (lastFromIp) {
      const waitMs =
        G.ipCooldownSeconds * 1000 -
        (Date.now() - new Date(lastFromIp.createdAt).getTime());
      if (waitMs > 0) {
        await block(
          ctx,
          429,
          'GUEST_IP_COOLDOWN',
          `An order was just placed from this network. Please wait ${Math.ceil(waitMs / 1000)}s before placing another.`
        );
      }
    }

    const [ipHour, ipDay] = await Promise.all([
      GuestOrderAttemptModel.countDocuments({
        ip: ctx.ip,
        outcome: 'placed',
        createdAt: {$gte: minutesAgo(60)}
      }),
      GuestOrderAttemptModel.countDocuments({
        ip: ctx.ip,
        outcome: 'placed',
        createdAt: {$gte: minutesAgo(24 * 60)}
      })
    ]);
    if (ipHour >= G.ipMaxPerHour || ipDay >= G.ipMaxPerDay) {
      await block(
        ctx,
        429,
        'GUEST_IP_LIMIT',
        'Too many guest orders from this network. Please try again later, or sign up for an account to keep ordering.'
      );
    }

    // ---- Per contact (phone / email) --------------------------------------
    const contactOr: Record<string, unknown>[] = [];
    if (ctx.phone) contactOr.push({phone: ctx.phone});
    if (ctx.email) contactOr.push({email: ctx.email});

    if (contactOr.length > 0) {
      const contactDay = await GuestOrderAttemptModel.countDocuments({
        $or: contactOr,
        outcome: 'placed',
        createdAt: {$gte: minutesAgo(24 * 60)}
      });
      if (contactDay >= G.contactMaxPerDay) {
        await block(
          ctx,
          429,
          'GUEST_CONTACT_LIMIT',
          'This phone number or email has reached the daily guest order limit. Sign up for an account to keep ordering.'
        );
      }

      const duplicate = await GuestOrderAttemptModel.exists({
        $or: contactOr,
        outcome: 'placed',
        itemsHash: ctx.itemsHash,
        createdAt: {$gte: minutesAgo(G.duplicateWindowMinutes)}
      });
      if (duplicate) {
        await block(
          ctx,
          409,
          'GUEST_DUPLICATE_ORDER',
          'You already placed this exact order a few minutes ago. Check your order status instead of placing it again.'
        );
      }
    }

    // Orders still in progress, read from the real orders collection so it
    // stays correct even after the attempt logs expire.
    const orderOr: Record<string, unknown>[] = [];
    if (ctx.phone) {
      orderOr.push({'guestInfo.phoneNumber': {$in: phoneVariants(ctx.phone)}});
    }
    if (ctx.email) {
      orderOr.push({
        'guestInfo.email': {
          $regex: `^${ctx.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i'
        }
      });
    }
    if (orderOr.length > 0) {
      const active = await OrderModel.countDocuments({
        isGuest: true,
        $or: orderOr,
        orderStatus: {$in: ACTIVE_GUEST_ORDER_STATUSES as unknown as string[]}
      });
      if (active >= G.contactMaxActive) {
        await block(
          ctx,
          429,
          'GUEST_ACTIVE_LIMIT',
          `You already have ${active} guest orders in progress. Please wait for them to be completed before ordering again.`
        );
      }
    }
  },

  /** Call once the order is saved, so it counts toward the limits. */
  async recordPlaced(ctx: GuestOrderGuardContext, orderId: unknown) {
    await GuestOrderAttemptModel.create({
      ...ctx,
      outcome: 'placed',
      reason: null,
      orderId
    }).catch(err => logger.error({err}, 'failed to record guest order'));
  }
};
