import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {orderMessageService} from '../services/orderMessage.service';

export const orderMessageController = {
  async listFollowUpOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderMessageService.listFollowUpOrders();
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

  async listForAdmin(_req: Request, res: Response, next: NextFunction) {
    try {
      if (!_req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
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

  async sendByAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
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
