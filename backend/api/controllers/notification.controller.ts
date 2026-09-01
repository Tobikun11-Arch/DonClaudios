import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {notificationService} from '../services/notification.service';

export const notificationController = {
  async listMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const notifications =
        await notificationService.listForCustomer(req.auth.userId);
      const unreadCount =
        await notificationService.countUnreadForCustomer(req.auth.userId);
      res.status(200).json({notifications, unreadCount});
    } catch (error) {
      next(error);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const notification = await notificationService.markRead(
        req.auth.userId,
        req.params.id
      );
      res.status(200).json({notification});
    } catch (error) {
      next(error);
    }
  },

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const unreadCount = await notificationService.markAllRead(
        req.auth.userId
      );
      res.status(200).json({unreadCount});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const result = await notificationService.remove(
        req.auth.userId,
        req.params.id
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async listAdminNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const notifications = await notificationService.listForAdmin(
        req.auth.userId
      );
      const unreadCount = await notificationService.countUnreadForAdmin(
        req.auth.userId
      );
      res.status(200).json({notifications, unreadCount});
    } catch (error) {
      next(error);
    }
  },

  async markReadAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const notification = await notificationService.markReadForAdmin(
        req.auth.userId,
        req.params.id
      );
      res.status(200).json({notification});
    } catch (error) {
      next(error);
    }
  },

  async markAllReadAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const unreadCount = await notificationService.markAllReadForAdmin(
        req.auth.userId
      );
      res.status(200).json({unreadCount});
    } catch (error) {
      next(error);
    }
  },

  async removeAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const result = await notificationService.removeForAdmin(
        req.auth.userId,
        req.params.id
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
