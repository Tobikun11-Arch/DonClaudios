import {Request, Response, NextFunction} from 'express';
import {productService} from '../services/product.service';
import {ApiError} from '../utils/error';

/**
 * Pre-order products are exclusive to signed-in users.
 *
 * Customers need them; owners and cashiers need them so they can manage and
 * sell them at the counter. Everyone else — i.e. a guest with no valid
 * session — must not receive them at all.
 */
function canSeePreOrder(req: Request): boolean {
  return (
    req.auth?.type === 'customer' ||
    req.auth?.type === 'admin' ||
    req.auth?.type === 'cashier'
  );
}

export const productController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.list(canSeePreOrder(req));
      res.status(200).json({products});
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getById(
        req.params.id,
        canSeePreOrder(req)
      );
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
