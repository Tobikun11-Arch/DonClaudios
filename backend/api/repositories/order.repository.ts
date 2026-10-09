import {OrderModel, OrderDocument} from '../models/Order.model';
import type {OrderStatus} from '../models/Order.model';
import type {FilterQuery, ClientSession} from 'mongoose';

export const orderRepository = {
  findById: (id: string, session?: ClientSession) =>
    OrderModel.findById(id, null, {session}).exec(),

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

  listInStore: () =>
    OrderModel.find({orderSource: 'in-store'})
      .sort({createdAt: -1})
      .exec(),

  create: (data: Partial<OrderDocument>, session?: ClientSession) =>
    session
      ? OrderModel.create([data], {session}).then(rows => rows[0])
      : OrderModel.create(data),

  updateStatus: (orderId: string, orderStatus: string) =>
    OrderModel.updateOne({_id: orderId}, {orderStatus}).exec(),

  /**
   * Records the transition AND resets the overdue latch. The latch is cleared
   * whenever the order leaves `preparing` so that a re-prep can alert again.
   */
  updateStatusWithHistory: (
    orderId: string,
    orderStatus: OrderStatus,
    at: Date
  ) =>
    OrderModel.updateOne(
      {_id: orderId},
      {
        $set: {
          orderStatus,
          ...(orderStatus === 'preparing'
            ? {overdueNotifiedAt: null}
            : {})
        },
        $push: {statusHistory: {status: orderStatus, at}}
      }
    ).exec(),

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

  cancel: (orderId: string, reason?: string) =>
    OrderModel.updateOne(
      {_id: orderId},
      {
        $set: {orderStatus: 'cancelled', cancelReason: reason},
        $push: {statusHistory: {status: 'cancelled', at: new Date()}}
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
    ).exec()
};
