import {Request, Response, NextFunction} from 'express';
import {productService} from '../services/product.service';
import {ApiError} from '../utils/error';

export const productController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.list();
      res.status(200).json({products});
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getById(req.params.id);
      res.status(200).json({product});
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const created = await productService.create(req.auth.userId, req.body);
      res.status(201).json({product: created});
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await productService.update(req.params.id, req.body);
      res.status(200).json({product: updated});
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.remove(req.params.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
