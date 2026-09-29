import {OrderModel, OrderDocument} from '../models/Order.model';
import type {OrderStatus} from '../models/Order.model';

export const orderRepository = {
  findById: (id: string) => OrderModel.findById(id).exec(),

  listByCustomerId: (customerId: string) =>
    OrderModel.find({customerId}).sort({createdAt: -1}).exec(),

  listAll: () => OrderModel.find({}).sort({createdAt: -1}).exec(),

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

  create: (data: Partial<OrderDocument>) => OrderModel.create(data),

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

  updateStockDeducted: (orderId: string, stockDeducted: boolean) =>
    OrderModel.updateOne({_id: orderId}, {stockDeducted}).exec()
};
