import {Request, Response, NextFunction} from 'express';
import {stockMovementService} from '../services/stockMovement.service';
import {ApiError} from '../utils/error';

export const stockMovementController = {
  async restock(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const product = await stockMovementService.restockProduct(
        req.params.productId,
        req.auth.userId,
        req.body
      );
      res.status(200).json({product});
    } catch (error) {
      next(error);
    }
  },

  async adjust(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const product = await stockMovementService.adjustStock(
        req.params.productId,
        req.auth.userId,
        req.body
      );
      res.status(200).json({product});
    } catch (error) {
      next(error);
    }
  },

  async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.query.productId as string | undefined;
      const movements = await stockMovementService.listMovements(productId);
      res.status(200).json({movements});
    } catch (error) {
      next(error);
    }
  }
};
