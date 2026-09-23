import {Request, Response, NextFunction} from 'express';
import {categoryService} from '../services/category.service';
import {ApiError} from '../utils/error';

export const categoryController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.list();
      res.status(200).json({categories});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const category = await categoryService.create(req.auth.userId, req.body);
      res.status(201).json({category});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.status(200).json({category});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await categoryService.remove(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};