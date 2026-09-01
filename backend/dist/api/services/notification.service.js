"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const error_1 = require("../utils/error");
const notification_repository_1 = require("../repositories/notification.repository");
exports.notificationService = {
    async listForCustomer(customerId) {
        return notification_repository_1.notificationRepository.listByCustomerId(customerId);
    },
    async countUnreadForCustomer(customerId) {
        return notification_repository_1.notificationRepository.countUnreadByCustomerId(customerId);
    },
    async listForAdmin(adminId) {
        return notification_repository_1.notificationRepository.listByAdminId(adminId);
    },
    async countUnreadForAdmin(adminId) {
        return notification_repository_1.notificationRepository.countUnreadByAdminId(adminId);
    },
    async createForCustomer(data) {
        return notification_repository_1.notificationRepository.create({
            target: 'customer',
            customerId: data.customerId,
            type: data.type,
            title: data.title,
            message: data.message,
            reviewId: data.reviewId ? data.reviewId : undefined,
            orderId: data.orderId ? data.orderId : undefined,
            link: data.link
        });
    },
    async createForAdmin(data) {
        return notification_repository_1.notificationRepository.create({
            target: 'admin',
            adminId: data.adminId,
            type: data.type,
            title: data.title,
            message: data.message,
            reviewId: data.reviewId ? data.reviewId : undefined,
            link: data.link
        });
    },
    async markRead(customerId, notificationId) {
        const notification = await notification_repository_1.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new error_1.ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
        }
        if (String(notification.customerId) !== customerId) {
            throw new error_1.ApiError(403, 'FORBIDDEN', 'You can only update your own notifications');
        }
        return notification_repository_1.notificationRepository.markRead(notificationId);
    },
    async markReadForAdmin(adminId, notificationId) {
        const notification = await notification_repository_1.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new error_1.ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
        }
        if (String(notification.adminId) !== adminId) {
            throw new error_1.ApiError(403, 'FORBIDDEN', 'You can only update your own notifications');
        }
        return notification_repository_1.notificationRepository.markRead(notificationId);
    },
    async markAllRead(customerId) {
        await notification_repository_1.notificationRepository.markAllReadByCustomerId(customerId);
        return notification_repository_1.notificationRepository.countUnreadByCustomerId(customerId);
    },
    async markAllReadForAdmin(adminId) {
        await notification_repository_1.notificationRepository.markAllReadByAdminId(adminId);
        return notification_repository_1.notificationRepository.countUnreadByAdminId(adminId);
    },
    async remove(customerId, notificationId) {
        const notification = await notification_repository_1.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new error_1.ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
        }
        if (String(notification.customerId) !== customerId) {
            throw new error_1.ApiError(403, 'FORBIDDEN', 'You can only delete your own notifications');
        }
        await notification_repository_1.notificationRepository.deleteById(notificationId);
        return { message: 'Notification deleted' };
    },
    async removeForAdmin(adminId, notificationId) {
        const notification = await notification_repository_1.notificationRepository.findById(notificationId);
        if (!notification) {
            throw new error_1.ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
        }
        if (String(notification.adminId) !== adminId) {
            throw new error_1.ApiError(403, 'FORBIDDEN', 'You can only delete your own notifications');
        }
        await notification_repository_1.notificationRepository.deleteById(notificationId);
        return { message: 'Notification deleted' };
    }
};
