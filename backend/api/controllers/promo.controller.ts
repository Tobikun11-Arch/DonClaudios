import {Request, Response, NextFunction} from 'express';
import {promoService} from '../services/promo.service';
import {ApiError} from '../utils/error';

export const promoController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const promos = await promoService.list();
      res.status(200).json({promos});
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const promo = await promoService.getById(req.params.id);
      res.status(200).json({promo});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const created = await promoService.create(req.auth.userId, req.body);
      res.status(201).json({promo: created});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await promoService.update(req.params.id, req.body);
      res.status(200).json({promo: updated});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await promoService.remove(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
