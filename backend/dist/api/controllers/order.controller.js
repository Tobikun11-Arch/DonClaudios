"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderController = void 0;
const error_1 = require("../utils/error");
const order_repository_1 = require("../repositories/order.repository");
const orderItem_repository_1 = require("../repositories/orderItem.repository");
const transaction_repository_1 = require("../repositories/transaction.repository");
const stockMovement_service_1 = require("../services/stockMovement.service");
const notification_service_1 = require("../services/notification.service");
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    on_the_way: 'On the Way',
    completed: 'Completed',
    cancelled: 'Cancelled'
};
exports.orderController = {
    async listMyOrders(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const orders = await order_repository_1.orderRepository.listByCustomerId(req.auth.userId);
            const orderIds = orders.map(order => String(order._id));
            const items = await orderItem_repository_1.orderItemRepository.listByOrderIds(orderIds);
            const itemsByOrderId = items.reduce((acc, item) => {
                const orderId = String(item.orderId);
                acc[orderId] = acc[orderId] ?? [];
                acc[orderId].push(item);
                return acc;
            }, {});
            res.json({
                orders: orders.map(order => ({
                    ...order.toObject(),
                    items: itemsByOrderId[String(order._id)] ?? []
                }))
            });
        }
        catch (error) {
            next(error);
        }
    },
    async createCustomerOrder(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const { orderType, items, totalAmount, riderNotes, paymentMethod } = req.body;
            const validOrderTypes = ['pickup', 'delivery', 'reservation'];
            if (!validOrderTypes.includes(orderType)) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
            }
            if (!Array.isArray(items) || items.length === 0) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'items are required');
            }
            const safeTotalAmount = Number(totalAmount);
            if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
            }
            const order = await order_repository_1.orderRepository.create({
                customerId: req.auth.userId,
                isGuest: false,
                orderType,
                totalAmount: safeTotalAmount,
                riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
                isOnline: true
            });
            const orderItems = items.map((i) => {
                const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
                const safePrice = Number(i.price);
                if (!isNonEmptyString(i.productId)) {
                    throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'items.productId is required');
                }
                if (!Number.isFinite(safePrice) || safePrice <= 0) {
                    throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
                }
                return {
                    orderId: order._id,
                    productId: i.productId,
                    quantity: safeQty,
                    price: safePrice,
                    specialRequest: isNonEmptyString(i.specialRequest)
                        ? i.specialRequest
                        : isNonEmptyString(i.instructions)
                            ? i.instructions
                            : undefined
                };
            });
            await orderItem_repository_1.orderItemRepository.createMany(orderItems);
            const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
            const allowedPm = ['cash', 'card', 'gcash', 'other'];
            const safePm = allowedPm.includes(pm)
                ? pm
                : 'cash';
            const transaction = await transaction_repository_1.transactionRepository.create({
                cashierId: null,
                orderId: order._id,
                paymentMethod: safePm,
                totalAmount: safeTotalAmount,
                isOnline: true
            });
            res.status(201).json({ order, transaction });
        }
        catch (error) {
            next(error);
        }
    },
    async createGuestOrder(req, res, next) {
        try {
            const { guestInfo, orderType, items, totalAmount, riderNotes, paymentMethod } = req.body;
            if (!guestInfo || typeof guestInfo !== 'object') {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'guestInfo is required');
            }
            if (!isNonEmptyString(guestInfo.firstName)) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'firstName is required');
            }
            if (!isNonEmptyString(guestInfo.lastName)) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'lastName is required');
            }
            if (!isNonEmptyString(guestInfo.phoneNumber)) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'phoneNumber is required');
            }
            const validOrderTypes = ['pickup', 'delivery', 'reservation'];
            if (!validOrderTypes.includes(orderType)) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
            }
            if (!Array.isArray(items) || items.length === 0) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'items are required');
            }
            const safeTotalAmount = Number(totalAmount);
            if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
            }
            const order = await order_repository_1.orderRepository.create({
                customerId: null,
                isGuest: true,
                guestInfo: {
                    firstName: guestInfo.firstName,
                    lastName: guestInfo.lastName,
                    phoneNumber: guestInfo.phoneNumber,
                    address: isNonEmptyString(guestInfo.address)
                        ? guestInfo.address
                        : undefined
                },
                orderType,
                totalAmount: safeTotalAmount,
                riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
                isOnline: true
            });
            const orderItems = items.map((i) => {
                const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
                const safePrice = Number(i.price);
                if (!isNonEmptyString(i.productId)) {
                    throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'items.productId is required');
                }
                if (!Number.isFinite(safePrice) || safePrice <= 0) {
                    throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
                }
                return {
                    orderId: order._id,
                    productId: i.productId,
                    quantity: safeQty,
                    price: safePrice,
                    specialRequest: isNonEmptyString(i.specialRequest)
                        ? i.specialRequest
                        : isNonEmptyString(i.instructions)
                            ? i.instructions
                            : undefined
                };
            });
            await orderItem_repository_1.orderItemRepository.createMany(orderItems);
            const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
            const allowedPm = ['cash', 'card', 'gcash', 'other'];
            const safePm = allowedPm.includes(pm)
                ? pm
                : 'cash';
            const transaction = await transaction_repository_1.transactionRepository.create({
                cashierId: null,
                orderId: order._id,
                paymentMethod: safePm,
                totalAmount: safeTotalAmount,
                isOnline: true
            });
            res.status(201).json({ order, transaction });
        }
        catch (error) {
            next(error);
        }
    },
    async updateStatus(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const { status } = req.body;
            const validStatuses = [
                'pending',
                'confirmed',
                'preparing',
                'ready',
                'on_the_way',
                'completed',
                'cancelled'
            ];
            if (!validStatuses.includes(status)) {
                throw new error_1.ApiError(400, 'VALIDATION_ERROR', 'Invalid order status');
            }
            const order = await order_repository_1.orderRepository.findById(req.params.id);
            if (!order) {
                throw new error_1.ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
            }
            if (status !== 'cancelled' && !order.stockDeducted) {
                await stockMovement_service_1.stockMovementService.deductOrderStock(String(order._id));
                await order_repository_1.orderRepository.updateStockDeducted(String(order._id), true);
            }
            if (status === 'cancelled' &&
                order.stockDeducted &&
                order.orderStatus !== 'pending') {
                await stockMovement_service_1.stockMovementService.restoreOrderStock(String(order._id), req.auth.userId);
                await order_repository_1.orderRepository.updateStockDeducted(String(order._id), false);
            }
            await order_repository_1.orderRepository.updateStatus(req.params.id, status);
            const updated = await order_repository_1.orderRepository.findById(req.params.id);
            if (order.customerId) {
                await notification_service_1.notificationService.createForCustomer({
                    customerId: String(order.customerId),
                    type: 'order_status',
                    title: 'Order Status Update',
                    message: `Your order (#${String(order._id).slice(-6).toUpperCase()}) is now ${STATUS_LABELS[status] ?? status}.`,
                    orderId: String(order._id),
                    link: '/customer/dashboard?tab=history'
                });
            }
            res.status(200).json({ order: updated });
        }
        catch (error) {
            next(error);
        }
    }
};
