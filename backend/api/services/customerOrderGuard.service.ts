import type {Request} from 'express';
import {CUSTOMER_ORDER_GUARD as G} from '../config/customerOrderGuard';
import {ACTIVE_GUEST_ORDER_STATUSES} from '../config/guestOrderGuard';
import {CustomerModel} from '../models/Customer.model';
import {CustomerOrderAttemptModel} from '../models/CustomerOrderAttempt.model';
import {OrderModel} from '../models/Order.model';
import {ApiError} from '../utils/error';
import {getClientIp} from '../utils/clientIp';
import {logger} from '../logging/logger';
import {hashItems} from './guestOrderGuard.service';

/**
 * Spam protection for ACCOUNT checkout (POST /orders/me). Layers, in order:
 *  1. Temporary block - account flagged for spam cannot order until it ends.
 *  2. Active cap      - orders still in progress.
 *  3. Daily cap       - orders placed in a rolling 24 hours.
 *  4. Duplicate       - same cart again within a short window.
 *  5. Cooldown        - claimed atomically on the customer document, so
 *                       parallel requests cannot all slip through.
 * A per-account burst limiter on the route and Turnstile sit in front.
 *
 * Every blocked attempt is logged to customer_order_attempts. Too many blocks
 * in a short window ("strikes") set orderBlockedUntil + flaggedForSpamAt.
 */

export type CustomerOrderGuardContext = {
  customerId: string;
  ip: string;
  itemsHash: string;
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

const BLOCKED_CODE = 'ACCOUNT_ORDER_BLOCKED';

function blockedMessage(until: Date) {
  return `Your account is temporarily unable to place orders because of unusual activity. Please try again after ${until.toLocaleString('en-PH', {timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short'})}, or contact the store.`;
}

async function block(
  ctx: CustomerOrderGuardContext,
  status: number,
  code: string,
  message: string
): Promise<never> {
  logger.warn(
    {customerId: ctx.customerId, ip: ctx.ip, code},
    'customer order blocked'
  );
  await CustomerOrderAttemptModel.create({
    ...ctx,
    outcome: 'blocked',
    reason: code
  }).catch(() => {});

  const strikes = await CustomerOrderAttemptModel.countDocuments({
    customerId: ctx.customerId,
    outcome: 'blocked',
    reason: {$ne: BLOCKED_CODE},
    createdAt: {$gte: minutesAgo(G.strikeWindowMinutes)}
  }).catch(() => 0);

  if (strikes >= G.strikeLimit) {
    const now = new Date();
    const until = new Date(now.getTime() + G.blockHours * 60 * 60 * 1000);
    await CustomerModel.updateOne(
      {_id: ctx.customerId},
      {$set: {orderBlockedUntil: until, flaggedForSpamAt: now}}
    ).catch(err => logger.error({err}, 'failed to flag customer for spam'));
    logger.warn(
      {customerId: ctx.customerId, ip: ctx.ip, strikes, until},
      'customer temporarily blocked from ordering'
    );
    throw new ApiError(403, BLOCKED_CODE, blockedMessage(until));
  }

  throw new ApiError(status, code, message);
}

export const customerOrderGuardService = {
  buildContext(
    req: Request,
    customerId: string,
    items: Array<{productId: string; quantity: number}>
  ): CustomerOrderGuardContext {
    return {customerId, ip: getClientIp(req), itemsHash: hashItems(items)};
  },

  /** Cheap check, run first: is the account under a temporary block? */
  async assertNotBlocked(ctx: CustomerOrderGuardContext) {
    const customer = await CustomerModel.findById(ctx.customerId)
      .select('orderBlockedUntil')
      .lean();
    const until = customer?.orderBlockedUntil;
    if (until && new Date(until).getTime() > Date.now()) {
      await CustomerOrderAttemptModel.create({
        ...ctx,
        outcome: 'blocked',
        reason: BLOCKED_CODE
      }).catch(() => {});
      throw new ApiError(403, BLOCKED_CODE, blockedMessage(new Date(until)));
    }
  },

  /** Database-backed caps. Run after validation, before reserving stock. */
  async assertWithinLimits(ctx: CustomerOrderGuardContext) {
    const [active, today, duplicate] = await Promise.all([
      OrderModel.countDocuments({
        customerId: ctx.customerId,
        orderStatus: {$in: ACTIVE_GUEST_ORDER_STATUSES as unknown as string[]}
      }),
      OrderModel.countDocuments({
        customerId: ctx.customerId,
        createdAt: {$gte: minutesAgo(24 * 60)}
      }),
      CustomerOrderAttemptModel.exists({
        customerId: ctx.customerId,
        outcome: 'placed',
        itemsHash: ctx.itemsHash,
        createdAt: {$gte: minutesAgo(G.duplicateWindowMinutes)}
      })
    ]);

    if (active >= G.maxActive) {
      await block(
        ctx,
        429,
        'CUSTOMER_ACTIVE_LIMIT',
        `You already have ${active} orders in progress. Please wait for one to be completed before placing another.`
      );
    }
    if (today >= G.maxPerDay) {
      await block(
        ctx,
        429,
        'CUSTOMER_DAILY_LIMIT',
        'You have reached the daily order limit for your account. Please try again tomorrow or contact the store.'
      );
    }
    if (duplicate) {
      await block(
        ctx,
        409,
        'CUSTOMER_DUPLICATE_ORDER',
        'You already placed this exact order a few minutes ago. Check your orders instead of placing it again.'
      );
    }
  },

  /**
   * Atomically claim the cooldown slot. Only one request per account can win
   * it per cooldown window, which also serialises the caps above. Call
   * `release()` if the order then fails, so a fixed cart can be retried
   * straight away.
   */
  async claimCooldown(
    ctx: CustomerOrderGuardContext
  ): Promise<{release: () => Promise<void>}> {
    const now = new Date();
    const cutoff = new Date(now.getTime() - G.cooldownSeconds * 1000);
    const prev = await CustomerModel.findOneAndUpdate(
      {
        _id: ctx.customerId,
        $or: [{lastOrderAt: null}, {lastOrderAt: {$lte: cutoff}}]
      },
      {$set: {lastOrderAt: now}},
      {new: false, projection: {lastOrderAt: 1}}
    ).lean();

    if (!prev) {
      const current = await CustomerModel.findById(ctx.customerId)
        .select('lastOrderAt')
        .lean();
      const last = current?.lastOrderAt
        ? new Date(current.lastOrderAt).getTime()
        : now.getTime();
      const waitSec = Math.max(
        1,
        Math.ceil((G.cooldownSeconds * 1000 - (now.getTime() - last)) / 1000)
      );
      await block(
        ctx,
        429,
        'CUSTOMER_ORDER_COOLDOWN',
        `You just placed an order. Please wait ${waitSec}s before placing another.`
      );
    }

    const previous = prev?.lastOrderAt ?? null;
    return {
      release: async () => {
        await CustomerModel.updateOne(
          {_id: ctx.customerId, lastOrderAt: now},
          {$set: {lastOrderAt: previous}}
        ).catch(err => logger.error({err}, 'failed to release order cooldown'));
      }
    };
  },

  /** Call once the order is saved (duplicate-cart check reads these rows). */
  async recordPlaced(ctx: CustomerOrderGuardContext, orderId: unknown) {
    await CustomerOrderAttemptModel.create({
      ...ctx,
      outcome: 'placed',
      reason: null,
      orderId
    }).catch(err => logger.error({err}, 'failed to record customer order'));
  }
};
