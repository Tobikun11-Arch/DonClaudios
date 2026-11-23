import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {orderMessageService} from '../services/orderMessage.service';
import {OrderModel} from '../models/Order.model';
import {assertCashierMayHandle} from '../services/ownerNotify.service';
import {orderRepository} from '../repositories/order.repository';
import {courierBookingService} from '../services/courierBooking.service';
import {resolveActor} from '../utils/actor';

/** Cashiers cannot read or answer pre-order follow-ups. */
async function guardPreOrder(req: Request) {
  if (req.auth?.type !== 'cashier') return;
  const order = await OrderModel.findById(req.params.id, {isPreOrder: 1}).lean();
  assertCashierMayHandle(req.auth, order);
}

export const orderMessageController = {
  async listFollowUpOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderMessageService.listFollowUpOrders(req.auth?.type === 'cashier');
      res.status(200).json({orders});
    } catch (error) {
      next(error);
    }
  },

  async listForCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const messages = await orderMessageService.listForCustomer(
        req.auth.userId,
        req.params.id
      );
      res.status(200).json({messages});
    } catch (error) {
      next(error);
    }
  },

  async listForGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await orderMessageService.listForGuest(req.params.id);
      res.status(200).json({messages});
    } catch (error) {
      next(error);
    }
  },

  async sendByGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await orderMessageService.sendByGuest(
        req.params.id,
        typeof req.body?.body === 'string' ? req.body.body : ''
      );
      res.status(201).json({message});
    } catch (error) {
      next(error);
    }
  },

  async listForAdmin(_req: Request, res: Response, next: NextFunction) {
    try {
      if (!_req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      await guardPreOrder(_req);
      const messages = await orderMessageService.listForAdmin(
        _req.auth.userId,
        _req.params.id
      );
      res.status(200).json({messages});
    } catch (error) {
      next(error);
    }
  },

  async sendByCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const message = await orderMessageService.sendByCustomer(
        req.auth.userId,
        req.params.id,
        req.body?.body ?? ''
      );
      res.status(201).json({message});
    } catch (error) {
      next(error);
    }
  },

  /** Customer: "I've booked my courier" (rider details optional). */
  async bookCourier(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      const order = await orderRepository.findById(req.params.id);
      if (!order || String(order.customerId) !== String(req.auth.userId)) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }
      const updated = await courierBookingService.book(req.params.id, req.body ?? {}, await resolveActor(req.auth));
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  /** Guest version: the order id is the link they hold (guest orders only). */
  async bookCourierAsGuest(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderRepository.findById(req.params.id);
      if (!order || !order.isGuest) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      const name = [order.guestInfo?.firstName, order.guestInfo?.lastName].filter(Boolean).join(' ') || null;
      const updated = await courierBookingService.book(req.params.id, req.body ?? {}, {id: null, type: 'guest', name});
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  /** Staff quick reply: "Got it, we'll have it ready". */
  async acknowledgeCourier(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      await guardPreOrder(req);
      const updated = await courierBookingService.acknowledge(
        req.params.id,
        await resolveActor(req.auth),
        typeof req.body?.body === 'string' ? req.body.body : null
      );
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  async sendByAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      await guardPreOrder(req);
      const message = await orderMessageService.sendByAdmin(
        req.auth.userId,
        req.params.id,
        req.body?.body ?? ''
      );
      res.status(201).json({message});
    } catch (error) {
      next(error);
    }
  }
};
