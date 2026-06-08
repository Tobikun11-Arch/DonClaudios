"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderItemRepository = void 0;
const OrderItem_model_1 = require("../models/OrderItem.model");
exports.orderItemRepository = {
    listByOrderId: (orderId) => OrderItem_model_1.OrderItemModel.find({ orderId }).exec(),
    listByOrderIds: (orderIds) => OrderItem_model_1.OrderItemModel.find({ orderId: { $in: orderIds } })
        .populate('productId', 'name imageUrl category')
        .exec(),
    createMany: (items) => OrderItem_model_1.OrderItemModel.insertMany(items)
};
