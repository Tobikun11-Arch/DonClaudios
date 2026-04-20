import {OrderItemModel, OrderItemDocument} from '../models/OrderItem.model';

export const orderItemRepository = {
  listByOrderId: (orderId: string) => OrderItemModel.find({orderId}).exec(),

  createMany: (items: Array<Partial<OrderItemDocument>>) => OrderItemModel.insertMany(items)
};
