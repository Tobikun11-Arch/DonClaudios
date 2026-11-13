import {Request, Response, NextFunction} from 'express';
import type {Model} from 'mongoose';
import {ApiError} from '../utils/error';
import {OrderModel} from '../models/Order.model';
import {TransactionModel} from '../models/Transaction.model';
import {OrderMessageModel} from '../models/OrderMessage.model';
import {SupportConversationModel} from '../models/SupportConversation.model';
import {SupportMessageModel} from '../models/SupportMessage.model';
import {ReviewModel} from '../models/Review.model';
import {NotificationModel} from '../models/Notification.model';
import {runOverdueCheck} from './order.controller';

/**
 * Change-check poll.
 *
 * The dashboards used to refetch every heavy list (all orders, notifications,
 * support queue, ...) every 5 seconds, which burned most of our Vercel CPU.
 * Now they poll this endpoint instead: it only returns a small fingerprint per
 * area (newest updatedAt + a count), read from indexes. The frontend refetches
 * a heavy list only when its fingerprint changes (plus a slow safety refetch).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = Model<any>;

async function latestTime(
  model: AnyModel,
  filter: Record<string, unknown>,
  field: 'updatedAt' | 'createdAt' = 'updatedAt'
): Promise<number> {
  const doc = (await model
    .findOne(filter)
    .sort({[field]: -1})
    .select(field)
    .lean()
    .exec()) as Record<string, unknown> | null;
  const value = doc?.[field];
  return value ? new Date(value as string | Date).getTime() : 0;
}

const fingerprint = (...parts: number[]) => parts.join('-');

// Overdue alerts used to piggyback on the 5s full-order poll. Keep them close
// to real time by running the (cheap, "preparing"-only) check from here,
// at most once per interval per server instance.
const OVERDUE_CHECK_INTERVAL_MS = 15_000;
let lastOverdueCheckAt = 0;
function maybeRunOverdueCheck() {
  const now = Date.now();
  if (now - lastOverdueCheckAt < OVERDUE_CHECK_INTERVAL_MS) return;
  lastOverdueCheckAt = now;
  runOverdueCheck().catch(error =>
    console.error('Failed to run overdue check', error)
  );
}

async function staffScopes(type: 'admin' | 'cashier', userId: string) {
  const notifFilter =
    type === 'admin'
      ? {target: 'admin', adminId: userId}
      : {target: 'cashier', cashierId: userId};

  const [
    orderAt,
    txAt,
    orderCount,
    msgAt,
    msgCount,
    convAt,
    supportMsgAt,
    supportMsgCount,
    reviewAt,
    reviewCount,
    notifAt,
    notifCount
  ] = await Promise.all([
    latestTime(OrderModel, {}),
    latestTime(TransactionModel, {}),
    OrderModel.estimatedDocumentCount().exec(),
    latestTime(OrderMessageModel, {}, 'createdAt'),
    OrderMessageModel.estimatedDocumentCount().exec(),
    latestTime(SupportConversationModel, {}),
    latestTime(SupportMessageModel, {}),
    SupportMessageModel.estimatedDocumentCount().exec(),
    latestTime(ReviewModel, {}),
    ReviewModel.estimatedDocumentCount().exec(),
    latestTime(NotificationModel, notifFilter),
    NotificationModel.countDocuments(notifFilter).exec()
  ]);

  return {
    orders: fingerprint(orderAt, txAt, orderCount),
    orderMessages: fingerprint(msgAt, msgCount),
    support: fingerprint(convAt, supportMsgAt, supportMsgCount),
    reviews: fingerprint(reviewAt, reviewCount),
    notifications: fingerprint(notifAt, notifCount)
  };
}

async function customerScopes(userId: string) {
  const notifFilter = {target: 'customer', customerId: userId};
  const [orderAt, orderCount, reviewAt, reviewCount, notifAt, notifCount] =
    await Promise.all([
      latestTime(OrderModel, {customerId: userId}),
      OrderModel.countDocuments({customerId: userId}).exec(),
      latestTime(ReviewModel, {customerId: userId}),
      ReviewModel.countDocuments({customerId: userId}).exec(),
      latestTime(NotificationModel, notifFilter),
      NotificationModel.countDocuments(notifFilter).exec()
    ]);

  return {
    orders: fingerprint(orderAt, orderCount),
    reviews: fingerprint(reviewAt, reviewCount),
    notifications: fingerprint(notifAt, notifCount)
  };
}

export const changesController = {
  async getChanges(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const {type, userId} = req.auth;

      let scopes: Record<string, string>;
      if (type === 'admin' || type === 'cashier') {
        maybeRunOverdueCheck();
        scopes = await staffScopes(type, userId);
      } else if (type === 'customer') {
        scopes = await customerScopes(userId);
      } else {
        scopes = {};
      }

      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({scopes});
    } catch (error) {
      next(error);
    }
  }
};
