import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import type {PaymentMethod} from '../models/Transaction.model';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export const orderController = {
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

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  }
};
