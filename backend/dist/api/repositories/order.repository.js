"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = void 0;
const Order_model_1 = require("../models/Order.model");
exports.orderRepository = {
    findById: (id) => Order_model_1.OrderModel.findById(id).exec(),
    listByCustomerId: (customerId) => Order_model_1.OrderModel.find({ customerId }).sort({ createdAt: -1 }).exec(),
    listGuestOrders: () => Order_model_1.OrderModel.find({ isGuest: true }).sort({ createdAt: -1 }).exec(),
    listByStatus: (orderStatus) => Order_model_1.OrderModel.find({ orderStatus }).sort({ createdAt: -1 }).exec(),
    create: (data) => Order_model_1.OrderModel.create(data),
    updateStatus: (orderId, orderStatus) => Order_model_1.OrderModel.updateOne({ _id: orderId }, { orderStatus }).exec(),
    updateStockDeducted: (orderId, stockDeducted) => Order_model_1.OrderModel.updateOne({ _id: orderId }, { stockDeducted }).exec()
};
