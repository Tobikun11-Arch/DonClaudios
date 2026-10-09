import type {ClientSession} from 'mongoose';
import {OrderItemModel, OrderItemDocument} from '../models/OrderItem.model';

export const orderItemRepository = {
  listByOrderId: (orderId: string, session?: ClientSession) =>
    OrderItemModel.find({orderId}, null, {session}).exec(),

  listByOrderIds: (orderIds: string[], session?: ClientSession) =>
    OrderItemModel.find({orderId: {$in: orderIds}}, null, {session})
      .populate('productId', 'name imageUrl category')
      .exec(),

  /**
   * Lean items (only the fields the allowance math needs) for use inside the
   * reservation transaction, where a populate would just add round-trips.
   */
  listLeanByOrderIds: (orderIds: string[], session?: ClientSession) =>
    OrderItemModel.find(
      {orderId: {$in: orderIds}},
      'orderId productId quantity',
      {session}
    )
      .lean()
      .exec(),

  createMany: (
    items: Array<Partial<OrderItemDocument>>,
    session?: ClientSession
  ) => OrderItemModel.insertMany(items, {session})
};
