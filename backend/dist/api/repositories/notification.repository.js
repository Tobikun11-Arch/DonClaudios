"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const Notification_model_1 = require("../models/Notification.model");
exports.notificationRepository = {
    listByCustomerId: (customerId) => Notification_model_1.NotificationModel.find({ target: 'customer', customerId })
        .sort({ createdAt: -1 })
        .exec(),
    listByAdminId: (adminId) => Notification_model_1.NotificationModel.find({ target: 'admin', adminId })
        .sort({ createdAt: -1 })
        .exec(),
    findById: (id) => Notification_model_1.NotificationModel.findById(id).exec(),
    countUnreadByCustomerId: (customerId) => Notification_model_1.NotificationModel.countDocuments({ target: 'customer', customerId, read: false }).exec(),
    countUnreadByAdminId: (adminId) => Notification_model_1.NotificationModel.countDocuments({ target: 'admin', adminId, read: false }).exec(),
    create: (data) => Notification_model_1.NotificationModel.create(data),
    markRead: (id) => Notification_model_1.NotificationModel.findByIdAndUpdate(id, { read: true, readAt: new Date() }, { new: true }).exec(),
    markAllReadByCustomerId: (customerId) => Notification_model_1.NotificationModel.updateMany({ target: 'customer', customerId, read: false }, { read: true, readAt: new Date() }).exec(),
    markAllReadByAdminId: (adminId) => Notification_model_1.NotificationModel.updateMany({ target: 'admin', adminId, read: false }, { read: true, readAt: new Date() }).exec(),
    deleteById: (id) => Notification_model_1.NotificationModel.findByIdAndDelete(id).exec()
};
