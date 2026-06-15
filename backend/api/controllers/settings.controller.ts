import {Request, Response, NextFunction} from 'express';
import {settingsService} from '../services/settings.service';

export const settingsController = {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.get();
      res.status(200).json({settings});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await settingsService.update(req.body);
      res.status(200).json({settings: updated});
    } catch (error) {
      next(error);
    }
  }
};
