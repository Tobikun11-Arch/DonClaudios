import {OrderModel, OrderDocument} from '../models/Order.model';

export const orderRepository = {
  findById: (id: string) => OrderModel.findById(id).exec(),

  listByCustomerId: (customerId: string) =>
    OrderModel.find({customerId}).sort({createdAt: -1}).exec(),

  listByIds: (orderIds: string[]) =>
    OrderModel.find({_id: {$in: orderIds}}).exec(),

  listGuestOrders: () =>
    OrderModel.find({isGuest: true}).sort({createdAt: -1}).exec(),

  listByStatus: (orderStatus: string) =>
    OrderModel.find({orderStatus}).sort({createdAt: -1}).exec(),

  create: (data: Partial<OrderDocument>) => OrderModel.create(data),

  updateStatus: (orderId: string, orderStatus: string) =>
    OrderModel.updateOne({_id: orderId}, {orderStatus}).exec(),

  updateStockDeducted: (orderId: string, stockDeducted: boolean) =>
    OrderModel.updateOne({_id: orderId}, {stockDeducted}).exec()
};
