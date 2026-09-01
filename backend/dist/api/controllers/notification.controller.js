"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const error_1 = require("../utils/error");
const notification_service_1 = require("../services/notification.service");
exports.notificationController = {
    async listMyNotifications(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const notifications = await notification_service_1.notificationService.listForCustomer(req.auth.userId);
            const unreadCount = await notification_service_1.notificationService.countUnreadForCustomer(req.auth.userId);
            res.status(200).json({ notifications, unreadCount });
        }
        catch (error) {
            next(error);
        }
    },
    async markRead(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const notification = await notification_service_1.notificationService.markRead(req.auth.userId, req.params.id);
            res.status(200).json({ notification });
        }
        catch (error) {
            next(error);
        }
    },
    async markAllRead(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const unreadCount = await notification_service_1.notificationService.markAllRead(req.auth.userId);
            res.status(200).json({ unreadCount });
        }
        catch (error) {
            next(error);
        }
    },
    async remove(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const result = await notification_service_1.notificationService.remove(req.auth.userId, req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    },
    async listAdminNotifications(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const notifications = await notification_service_1.notificationService.listForAdmin(req.auth.userId);
            const unreadCount = await notification_service_1.notificationService.countUnreadForAdmin(req.auth.userId);
            res.status(200).json({ notifications, unreadCount });
        }
        catch (error) {
            next(error);
        }
    },
    async markReadAdmin(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const notification = await notification_service_1.notificationService.markReadForAdmin(req.auth.userId, req.params.id);
            res.status(200).json({ notification });
        }
        catch (error) {
            next(error);
        }
    },
    async markAllReadAdmin(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const unreadCount = await notification_service_1.notificationService.markAllReadForAdmin(req.auth.userId);
            res.status(200).json({ unreadCount });
        }
        catch (error) {
            next(error);
        }
    },
    async removeAdmin(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const result = await notification_service_1.notificationService.removeForAdmin(req.auth.userId, req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
};
