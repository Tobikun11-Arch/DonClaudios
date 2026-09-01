"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRepository = void 0;
const Order_model_1 = require("../models/Order.model");
const Review_model_1 = require("../models/Review.model");
exports.reviewRepository = {
    findById: (id) => Review_model_1.ReviewModel.findById(id).exec(),
    listApproved: () => Review_model_1.ReviewModel.find({ status: 'approved' }).sort({ createdAt: -1 }).exec(),
    listAll: () => Review_model_1.ReviewModel.find({}).sort({ createdAt: -1 }).exec(),
    listByCustomerId: (customerId) => Review_model_1.ReviewModel.find({ customerId }).sort({ createdAt: -1 }).exec(),
    hasCompletedOrder: (customerId) => Order_model_1.OrderModel.exists({
        customerId,
        isGuest: false,
        orderStatus: 'completed'
    }).exec(),
    create: (data) => Review_model_1.ReviewModel.create(data),
    updateStatus: (id, status) => Review_model_1.ReviewModel.findByIdAndUpdate(id, { status }, { new: true }).exec(),
    addReply: (id, reply, adminId) => Review_model_1.ReviewModel.findByIdAndUpdate(id, { reply, replyDate: new Date(), repliedBy: adminId }, { new: true }).exec(),
    addMessage: (id, message) => Review_model_1.ReviewModel.findByIdAndUpdate(id, { $push: { messages: message } }, { new: true }).exec()
};
