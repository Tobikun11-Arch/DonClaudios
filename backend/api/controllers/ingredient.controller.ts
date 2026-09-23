import {Request, Response, NextFunction} from 'express';
import {ingredientService} from '../services/ingredient.service';
import {ApiError} from '../utils/error';

export const ingredientController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const ingredients = await ingredientService.list();
      res.status(200).json({ingredients});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const created = await ingredientService.create(req.auth.userId, req.body);
      res.status(201).json({ingredient: created});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await ingredientService.update(req.params.id, req.body);
      res.status(200).json({ingredient: updated});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ingredientService.remove(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};