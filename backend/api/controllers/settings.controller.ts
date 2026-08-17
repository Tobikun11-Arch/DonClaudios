import {Request, Response, NextFunction} from 'express';
import {settingsService} from '../services/settings.service';

export const settingsController = {
  async getSettings(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.get();
      res.status(200).json({settings});
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
  }
};
