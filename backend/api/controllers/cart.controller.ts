import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {cartService} from '../services/cart.service';

export const cartController = {
  async getMyCart(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const cart = await cartService.getCart(req.auth.userId);
      res.status(200).json({cart});
    } catch (error) {
      next(error);
    }
  },

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const {productId, name, price, quantity, imageUrl} = req.body;

      const cart = await cartService.addItem(req.auth.userId, {
        productId,
        name,
        price,
        quantity,
        imageUrl
      });

      res.status(200).json({cart});
    } catch (error) {
      next(error);
    }
  },

  async setQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const {quantity} = req.body;

      const cart = await cartService.setQuantity(
        req.auth.userId,
        req.params.productId,
        quantity
      );

      res.status(200).json({cart});
    } catch (error) {
      next(error);
    }
  },

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const cart = await cartService.removeItem(
        req.auth.userId,
        req.params.productId
      );

      res.status(200).json({cart});
    } catch (error) {
      next(error);
    }
  },

  async clear(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const cart = await cartService.clear(req.auth.userId);
      res.status(200).json({cart});
    } catch (error) {
      next(error);
    }
  }
};
