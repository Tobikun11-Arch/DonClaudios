import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {pushService} from '../services/push.service';

export const pushController = {
  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const {endpoint, keys} = req.body || {};
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new ApiError(400, 'INVALID_SUBSCRIPTION', 'Invalid subscription payload');
      }
      const userId = req.auth?.userId || null;
      const userType = req.auth?.type || null;
      await pushService.subscribe({
        endpoint,
        keys,
        userId,
        userType: userType as 'customer' | 'admin' | 'cashier' | null
      });
      res.status(201).json({success: true});
    } catch (error) {
      next(error);
    }
  },

  async unsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const {endpoint} = req.body || {};
      const result = await pushService.unsubscribe(endpoint);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async send(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      // Only admin can broadcast test push (permissive for capstone)
      if (req.auth.type !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Admin access required');
      }
      const {message, title, userId, userType, broadcast} = req.body || {};
      const payload = {
        title: title || "DonClaudio's Lechon House",
        body: message || 'Test notification',
        url: req.body?.url || '/'
      };
      if (broadcast) {
        await pushService.sendToAll(payload);
      } else if (userId) {
        await pushService.sendToUser(userId, userType || 'customer', payload);
      } else {
        throw new ApiError(400, 'INVALID_TARGET', 'Provide userId or broadcast=true');
      }
      res.status(200).json({success: true});
    } catch (error) {
      next(error);
    }
  }
};
