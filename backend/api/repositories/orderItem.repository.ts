import {OrderItemModel, OrderItemDocument} from '../models/OrderItem.model';

export const orderItemRepository = {
  listByOrderId: (orderId: string) => OrderItemModel.find({orderId}).exec(),

  listByOrderIds: (orderIds: string[]) =>
    OrderItemModel.find({orderId: {$in: orderIds}})
      .populate('productId', 'name imageUrl category')
      .exec(),

  createMany: (items: Array<Partial<OrderItemDocument>>) =>
    OrderItemModel.insertMany(items)
};
