import type {Request, Response, NextFunction} from 'express';
import {orderRepository} from '../repositories/order.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {paymentService, assertWebhookToken} from '../services/payment.service';
import {isPaymentChannel} from '../config/paymentFees';
import {assertOrderCustomerAccess} from '../utils/orderAccess';
import {ApiError} from '../utils/error';

async function loadOrder(id: string) {
  const order = await orderRepository.findById(id).catch(() => null);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  return order;
}

function isStaff(req: Request) {
  return req.auth?.type === 'admin' || req.auth?.type === 'cashier';
}

export const paymentController = {
  /** GET /orders/:id/payment — payment step summary (customer or staff). */
  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await loadOrder(req.params.id);
      if (!isStaff(req)) assertOrderCustomerAccess(order, req);
      res.status(200).json({payment: await paymentService.getSummary(order)});
    } catch (error) {
      next(error);
    }
  },

  /** POST /orders/:id/payment/checkout {kind, channel} -> {invoiceUrl}. */
  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await loadOrder(req.params.id);
      assertOrderCustomerAccess(order, req);

      const kind = req.body?.kind;
      if (kind !== 'full' && kind !== 'down_payment') {
        throw new ApiError(400, 'VALIDATION_ERROR', "kind must be 'full' or 'down_payment'");
      }
      const channel = req.body?.channel;
      if (!isPaymentChannel(channel)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid payment channel');
      }

      const result = await paymentService.startCheckout(order, kind, channel);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /** POST /orders/:id/payment/cash — cash on pickup for the whole order. */
  async chooseCash(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await loadOrder(req.params.id);
      assertOrderCustomerAccess(order, req);
      await paymentService.chooseCashOnPickup(order);

      const orderId = String(order._id);
      const [updated, transaction] = await Promise.all([
        orderRepository.findById(orderId),
        transactionRepository.findByOrderId(orderId)
      ]);
      res.status(200).json({order: updated, transaction});
    } catch (error) {
      next(error);
    }
  },

  /** POST /orders/:id/payment/balance {method: 'cash' | 'online', channel?}. */
  async payBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await loadOrder(req.params.id);
      assertOrderCustomerAccess(order, req);

      const method = req.body?.method;
      if (method === 'cash') {
        await paymentService.chooseCashBalance(order);
        const updated = await orderRepository.findById(String(order._id));
        res.status(200).json({order: updated});
        return;
      }
      if (method !== 'online') {
        throw new ApiError(400, 'VALIDATION_ERROR', "method must be 'cash' or 'online'");
      }
      const channel = req.body?.channel;
      if (!isPaymentChannel(channel)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Please choose a valid payment channel');
      }
      const result = await paymentService.startCheckout(order, 'balance', channel);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /** POST /webhooks/xendit/invoice — Xendit invoice callback. */
  async invoiceWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      assertWebhookToken(req.headers['x-callback-token']);
      const result = await paymentService.handleInvoiceWebhook(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /** POST /webhooks/xendit/refund — Xendit refund callback. */
  async refundWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      assertWebhookToken(req.headers['x-callback-token']);
      const result = await paymentService.handleRefundWebhook(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
