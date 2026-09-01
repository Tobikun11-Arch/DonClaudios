import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {reviewService} from '../services/review.service';

export const reviewController = {
  async listPublic(_req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await reviewService.listPublic();
      res.status(200).json({reviews});
    } catch (error) {
      next(error);
    }
  },

  async listAdmin(_req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await reviewService.listForAdmin();
      res.status(200).json({reviews});
    } catch (error) {
      next(error);
    }
  },

  async listMyReviews(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const reviews = await reviewService.listMyReviews(req.auth.userId);
      res.status(200).json({reviews});
    } catch (error) {
      next(error);
    }
  },

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const review = await reviewService.createById(req.auth.userId, req.body);
      res.status(201).json({review});
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewService.updateStatusById(
        req.params.id,
        req.body.status
      );
      res.status(200).json({review});
    } catch (error) {
      next(error);
    }
  },

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const review = await reviewService.replyToReview(
        req.params.id,
        req.auth.userId,
        req.body.reply
      );
      res.status(200).json({review});
    } catch (error) {
      next(error);
    }
  },

  async customerReply(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const review = await reviewService.replyByCustomer(
        req.params.id,
        req.auth.userId,
        req.body.reply
      );
      res.status(200).json({review});
    } catch (error) {
      next(error);
    }
  }
};
