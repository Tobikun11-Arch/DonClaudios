import {Request, Response, NextFunction} from 'express';
import {settingsService} from '../services/settings.service';
import {adminRepository} from '../repositories/admin.repository';
import {ApiError} from '../utils/error';


export const settingsController = {
  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.get();
      // Expose the admin's business identity publicly so any tenant's branding
      // (name + logo) shows on customer-facing pages without authentication.
      const admins = await adminRepository.listAll();
      const admin = admins[0];
      const plain = (settings as any).toJSON ? (settings as any).toJSON() : settings;
      const merged = {
        ...plain,
        brandName: admin?.businessName || "DonClaudio's Lechon House",
        brandLogo: admin?.businessLogo || '/assets/logo.png'
      };
      res.status(200).json({settings: merged});
    } catch (error) {
      next(error);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.update(req.body);
      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  },

  async getNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const preferences = await adminRepository.getNotificationPreferences(req.auth.userId);
      res.status(200).json({preferences});
    } catch (error) {
      next(error);
    }
  },

  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const admin = await adminRepository.updateNotificationPreferences(
        req.auth.userId,
        req.body
      );
      if (!admin) {
        throw new ApiError(404, 'ADMIN_NOT_FOUND', 'Admin not found');
      }
      res.status(200).json({preferences: admin.notificationPreferences});
    } catch (error) {
      next(error);
    }
  }
};
