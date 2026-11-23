import {settingsService} from '../services/settings.service';
import {OrderModel, OrderDocument} from '../models/Order.model';
import type {OrderActor, OrderStatus, PaymentStatus} from '../models/Order.model';
import type {FilterQuery, ClientSession} from 'mongoose';

export const orderRepository = {
  findById: (id: string, session?: ClientSession) =>
    OrderModel.findById(id, null, {session}).exec(),

  findByClientRef: (clientRef: string) =>
    OrderModel.findOne({clientRef}).exec(),

  listByCustomerId: (customerId: string) =>
    OrderModel.find({customerId}).sort({createdAt: -1}).exec(),

  listAll: () => OrderModel.find({}).sort({createdAt: -1}).exec(),

  /**
   * Bounded, newest-first page of orders. `limit` of 0 disables the limit so
   * callers without `page`/`limit` (the cashier poll) get the full queue.
   */
  listPaginated: (filter: Record<string, unknown>, page: number, limit: number, session?: ClientSession) => {
    const query = OrderModel.find(filter as FilterQuery<OrderDocument>).sort({createdAt: -1});
    if (limit > 0) {
      query.skip((page - 1) * limit).limit(limit);
    }
    if (session) query.session(session);
    return query.exec();
  },

  countByFilter: (filter: Record<string, unknown>) =>
    OrderModel.countDocuments(filter as FilterQuery<OrderDocument>).exec(),

  /** Sum of `totalAmount` over the filter, excluding cancelled orders. */
  sumRevenue: (filter: Record<string, unknown>) =>
    OrderModel.aggregate<{_id: null; revenue: number}>([
      {$match: {...filter, orderStatus: {$ne: 'cancelled'}}},
      {$group: {_id: null, revenue: {$sum: '$totalAmount'}}}
    ]).exec(),

  /** Per-status and per-type counts over the (range-scoped) filter. */
  countsByFilter: (filter: Record<string, unknown>) =>
    OrderModel.aggregate<{
      status: Array<{_id: string; count: number}>;
      type: Array<{_id: string; count: number}>;
    }>([
      {$match: filter as FilterQuery<OrderDocument>},
      {
        $facet: {
          status: [{$group: {_id: '$orderStatus', count: {$sum: 1}}}],
          type: [{$group: {_id: '$orderType', count: {$sum: 1}}}]
        }
      }
    ]).exec(),

  listByIds: (orderIds: string[]) =>
    OrderModel.find({_id: {$in: orderIds}}).exec(),

  listGuestOrders: () =>
    OrderModel.find({isGuest: true}).sort({createdAt: -1}).exec(),

  listByStatus: (orderStatus: string) =>
    OrderModel.find({orderStatus}).sort({createdAt: -1}).exec(),

  listInStore: (filter: Record<string, unknown> = {}) =>
    OrderModel.find({orderSource: 'in-store', ...filter})
      .sort({createdAt: -1})
      .exec(),

  /**
   * Every new order snapshots the owner's current down payment percent, so a
   * later settings change never alters what an existing order owes.
   */
  create: async (data: Partial<OrderDocument>, session?: ClientSession) => {
    const withPercent: Partial<OrderDocument> =
      data.downPaymentPercent == null
        ? {
            ...data,
            downPaymentPercent: await settingsService.getDownPaymentPercent(
              data.isPreOrder ? 'preorder' : (data.orderType ?? 'pickup')
            )
          }
        : data;
    return session
      ? OrderModel.create([withPercent], {session}).then(rows => rows[0])
      : OrderModel.create(withPercent);
  },

  updateStatus: (orderId: string, orderStatus: string) =>
    OrderModel.updateOne({_id: orderId}, {orderStatus}).exec(),

  /**
   * Records the transition AND resets the overdue latch. The latch is cleared
   * whenever the order leaves `preparing` so that a re-prep can alert again.
   */
  updateStatusWithHistory: (
    orderId: string,
    orderStatus: OrderStatus,
    at: Date,
    cancelReason?: string,
    by?: OrderActor | null
  ) =>
    OrderModel.updateOne(
      {_id: orderId},
      {
        $set: {
          orderStatus,
          // The first staff member to confirm "takes" the order.
          ...(orderStatus === 'confirmed' && by && by.type !== 'customer' && by.type !== 'guest'
            ? {handledBy: by}
            : {}),
          ...(orderStatus === 'preparing'
            ? {overdueNotifiedAt: null}
            : {}),
          ...(orderStatus === 'cancelled' && cancelReason
            ? {cancelReason}
            : {})
        },
        $push: {statusHistory: {status: orderStatus, at, by: by ?? null}}
      }
    ).exec(),

  /** Claims one status email: true only for the first caller per status. */
  claimStatusEmail: async (orderId: string, status: string) => {
    const res = await OrderModel.updateOne(
      {_id: orderId, emailedStatuses: {$ne: status}},
      {$addToSet: {emailedStatuses: status}}
    ).exec();
    return res.modifiedCount === 1;
  },

  /**
   * Atomic idempotency latch. Exactly one caller can flip overdueNotifiedAt
   * from null to a value, so concurrent 5s polls from several cashiers produce
   * a single alert.
   */
  claimOverdueNotification: (orderId: string, at: Date) =>
    OrderModel.updateOne(
      {_id: orderId, overdueNotifiedAt: null},
      {$set: {overdueNotifiedAt: at}}
    ).exec(),

  cancel: (orderId: string, reason?: string, by?: OrderActor | null) =>
    OrderModel.updateOne(
      {_id: orderId},
      {
        $set: {orderStatus: 'cancelled', cancelReason: reason},
        $push: {statusHistory: {status: 'cancelled', at: new Date(), by: by ?? null}}
      }
    ).exec(),

  updateStockDeducted: (orderId: string, stockDeducted: boolean, session?: ClientSession) =>
    OrderModel.updateOne({_id: orderId}, {stockDeducted}, {session}).exec(),

  /**
   * Atomic latches for the stock flags. Exactly one caller can flip
   * `stockDeducted` false->true (deduct) or true->false (restore), so a
   * retried / concurrent confirm or cancel can never deduct or restore twice.
   */
  claimStockDeducted: (orderId: string) =>
    OrderModel.updateOne(
      {_id: orderId, stockDeducted: false},
      {$set: {stockDeducted: true}}
    ).exec(),

  claimStockRestore: (orderId: string) =>
    OrderModel.updateOne(
      {_id: orderId, stockDeducted: true},
      {$set: {stockDeducted: false}}
    ).exec(),

  /**
   * Atomic idempotency latch for loyalty points. Exactly one caller can flip
   * pointsAwarded from null to a value, so a repeated `completed` status
   * update cannot award the same points twice.
   */
  claimPointsAwarded: (orderId: string, points: number) =>
    OrderModel.updateOne(
      {_id: orderId, pointsAwarded: null},
      {$set: {pointsAwarded: points}}
    ).exec(),

  /**
   * Atomic idempotency latch for a points clawback. Exactly one caller can
   * flip pointsReversed from false to true, so cancelling an already
   * cancelled / completed order cannot deduct the same points twice.
   */
  claimPointsReversal: (orderId: string) =>
    OrderModel.updateOne(
      {_id: orderId, pointsReversed: false},
      {$set: {pointsReversed: true}}
    ).exec(),

  /**
   * Atomic payment-summary update guarded by the current paymentStatus, so a
   * retried webhook (or a race with "Cash received") applies exactly once.
   */
  updatePaymentIfStatus: (
    orderId: string,
    fromStatuses: PaymentStatus[],
    patch: Record<string, unknown>,
    inc?: Record<string, number>
  ) =>
    OrderModel.updateOne(
      {_id: orderId, paymentStatus: {$in: fromStatuses}},
      inc ? {$set: patch, $inc: inc} : {$set: patch}
    ).exec(),

  /**
   * Atomic idempotency latch for marking an order as paid (walk-in, or cash
   * collected for an online pickup order). Only flips when the order is
   * currently not paid, so a duplicate request (or a click
   * that races with another cashier) cannot overwrite paidAt/paidBy.
   */
  markPaidIfUnpaid: (
    orderId: string,
    paidAt: Date,
    paidBy: string
  ) =>
    OrderModel.updateOne(
      {_id: orderId, paymentStatus: {$ne: 'paid'}},
      {$set: {paymentStatus: 'paid', paidAt, paidBy}}
    ).exec(),

  /**
   * Latch for auto-cancelling an overdue in-store payment: clears the
   * deadline only if the order is still confirmed, unpaid and past it.
   */
  claimInStoreExpiry: (orderId: string, now: Date) =>
    OrderModel.updateOne(
      {
        _id: orderId,
        orderStatus: 'confirmed',
        paymentStatus: 'unpaid',
        paymentChoice: {$in: ['in_store_full', 'in_store_down_payment']},
        paymentExpiresAt: {$lte: now}
      },
      {$set: {paymentExpiresAt: null}}
    ).exec(),

  /** Claims the auto-cancel of a dated order whose payment deadline passed. */
  claimPaymentDueExpiry: (orderId: string, now: Date) =>
    OrderModel.updateOne(
      {
        _id: orderId,
        orderStatus: 'confirmed',
        paymentStatus: {$in: ['unpaid', null]},
        paymentChoice: {$ne: 'cash_on_pickup'},
        paymentDueAt: {$lte: now}
      },
      {$set: {paymentDueAt: null}}
    ).exec(),

  /** Claims the one "pay soon" reminder of an order. */
  claimPaymentReminder: (orderId: string, now: Date) =>
    OrderModel.updateOne(
      {_id: orderId, paymentReminderSentAt: null},
      {$set: {paymentReminderSentAt: now}}
    ).exec(),

  updateFields: (orderId: string, patch: Record<string, unknown>) =>
    OrderModel.findByIdAndUpdate(orderId, {$set: patch}, {new: true}).exec()
};
