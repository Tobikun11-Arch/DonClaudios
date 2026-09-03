import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {rewardService} from '../services/reward.service';

export const rewardController = {
  async getRewards(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const data = await rewardService.getRewardsForCustomer(req.auth.userId);
      res.json(data);
    } catch (error) {
      next(error);
    }
  },

  async redeem(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const {productId, quantity} = req.body;
      const data = await rewardService.redeem(
        req.auth.userId,
        productId,
        quantity
      );
      res.status(201).json(data);
    } catch (error) {
      next(error);
    }
  }
};
