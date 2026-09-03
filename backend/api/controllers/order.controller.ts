import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {stockMovementService} from '../services/stockMovement.service';
import {notificationService} from '../services/notification.service';
import {cashierRepository} from '../repositories/cashier.repository';
import type {PaymentMethod} from '../models/Transaction.model';
import type {OrderStatus} from '../models/Order.model';
import type {CashierDocument} from '../models/Cashier.model';

async function notifyCashiersOfNewOrder(orderId: string, totalAmount: number) {
  try {
    const cashiers = (await cashierRepository.listAll()) as
      | (CashierDocument & {_id: unknown})[]
      | null;
    for (const cashier of cashiers ?? []) {
      try {
        await notificationService.createForCashier({
          cashierId: String(cashier._id),
          type: 'new_order',
          title: 'New order',
          message: `A new order (#${String(orderId).slice(-6).toUpperCase()}) worth ₱${totalAmount}.00 has been placed.`,
          orderId: orderId,
          link: '/cashier/dashboard?tab=orders'
        });
      } catch (error) {
        console.error('Failed to create new order cashier notification', error);
      }
    }
  } catch (error) {
    console.error('Failed to notify cashiers of new order', error);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  on_the_way: 'On the Way',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const orderController = {
  async listAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderRepository.listAll();
      const orderIds = orders.map(order => String(order._id));
      const items = await orderItemRepository.listByOrderIds(orderIds);
      const itemsByOrderId = items.reduce<Record<string, typeof items>>(
        (acc, item) => {
          const orderId = String(item.orderId);
          acc[orderId] = acc[orderId] ?? [];
          acc[orderId].push(item);
          return acc;
        },
        {}
      );

      res.json({
        orders: orders.map(order => ({
          ...order.toObject(),
          items: itemsByOrderId[String(order._id)] ?? []
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async listMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const orders = await orderRepository.listByCustomerId(req.auth.userId);
      const orderIds = orders.map(order => String(order._id));
      const items = await orderItemRepository.listByOrderIds(orderIds);
      const itemsByOrderId = items.reduce<Record<string, typeof items>>(
        (acc, item) => {
          const orderId = String(item.orderId);
          acc[orderId] = acc[orderId] ?? [];
          acc[orderId].push(item);
          return acc;
        },
        {}
      );

      res.json({
        orders: orders.map(order => ({
          ...order.toObject(),
          items: itemsByOrderId[String(order._id)] ?? []
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async createCustomerOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const {orderType, items, totalAmount, riderNotes, paymentMethod} =
        req.body;

      const validOrderTypes = ['pickup', 'delivery', 'reservation'] as const;
      if (!validOrderTypes.includes(orderType)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      const safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      const order = await orderRepository.create({
        customerId: req.auth.userId as any,
        isGuest: false,
        orderType,
        totalAmount: safeTotalAmount,
        riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
        isOnline: true
      });

      const orderItems = items.map((i: any) => {
        const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
        const safePrice = Number(i.price);

        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }

        if (!Number.isFinite(safePrice) || safePrice <= 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
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

      await orderItemRepository.createMany(orderItems);

      const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
      const allowedPm = ['cash', 'card', 'gcash', 'other'] as const;
      const safePm: PaymentMethod = allowedPm.includes(pm as any)
        ? (pm as PaymentMethod)
        : 'cash';

      const transaction = await transactionRepository.create({
        cashierId: null,
        orderId: order._id,
        paymentMethod: safePm,
        totalAmount: safeTotalAmount,
        isOnline: true
      });

      notifyCashiersOfNewOrder(String(order._id), safeTotalAmount);

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  },

  async createGuestOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        guestInfo,
        orderType,
        items,
        totalAmount,
        riderNotes,
        paymentMethod
      } = req.body;

      if (!guestInfo || typeof guestInfo !== 'object') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'guestInfo is required');
      }

      if (!isNonEmptyString(guestInfo.firstName)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'firstName is required');
      }
      if (!isNonEmptyString(guestInfo.lastName)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'lastName is required');
      }
      if (!isNonEmptyString(guestInfo.phoneNumber)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'phoneNumber is required');
      }

      const validOrderTypes = ['pickup', 'delivery', 'reservation'] as const;
      if (!validOrderTypes.includes(orderType)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      const safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      const order = await orderRepository.create({
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

      const orderItems = items.map((i: any) => {
        const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
        const safePrice = Number(i.price);

        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }

        if (!Number.isFinite(safePrice) || safePrice <= 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
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

      await orderItemRepository.createMany(orderItems);

      const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
      const allowedPm = ['cash', 'card', 'gcash', 'other'] as const;
      const safePm: PaymentMethod = allowedPm.includes(pm as any)
        ? (pm as PaymentMethod)
        : 'cash';

      const transaction = await transactionRepository.create({
        cashierId: null,
        orderId: order._id,
        paymentMethod: safePm,
        totalAmount: safeTotalAmount,
        isOnline: true
      });

      notifyCashiersOfNewOrder(String(order._id), safeTotalAmount);

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const {status} = req.body;
      const validStatuses: OrderStatus[] = [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'on_the_way',
        'completed',
        'cancelled'
      ];

      if (!validStatuses.includes(status)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid order status');
      }

      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (status !== 'cancelled' && !order.stockDeducted) {
        await stockMovementService.deductOrderStock(String(order._id));
        await orderRepository.updateStockDeducted(String(order._id), true);
      }

      if (
        status === 'cancelled' &&
        order.stockDeducted &&
        order.orderStatus !== 'pending'
      ) {
        await stockMovementService.restoreOrderStock(
          String(order._id),
          req.auth.userId
        );
        await orderRepository.updateStockDeducted(String(order._id), false);
      }

      await orderRepository.updateStatus(req.params.id, status);

      const updated = await orderRepository.findById(req.params.id);

      if (order.customerId) {
        await notificationService.createForCustomer({
          customerId: String(order.customerId),
          type: 'order_status',
          title: 'Order Status Update',
          message: `Your order (#${String(order._id).slice(-6).toUpperCase()}) is now ${STATUS_LABELS[status] ?? status}.`,
          orderId: String(order._id),
          link: '/customer/dashboard?tab=history'
        });

        if (status === 'completed') {
          try {
            await notificationService.createReviewRequestForCustomer({
              customerId: String(order.customerId),
              orderId: String(order._id),
              title: 'We\u2019d love your feedback!',
              message: `Your order (#${String(order._id).slice(-6).toUpperCase()}) was completed. Please take a moment to share your experience.`
            });
          } catch (error) {
            console.error('Failed to create review request notification', error);
          }
        }
      }

      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  }
};
