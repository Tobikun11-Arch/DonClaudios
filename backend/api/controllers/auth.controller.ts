import {Request, Response, NextFunction} from 'express';
import {authService} from '../services/auth.service';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.verify(req.body.email, req.body.code);
      res.status(200).json({message: 'Verified'});
    } catch (error) {
      next(error);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resendVerification(req.body.email);
      res.status(200).json({message: 'Verification code resent'});
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const tokens = await authService.login(req.body.email, req.body.password);
      res.status(200).json(tokens);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.refreshAccessToken(
        req.body.refreshToken
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
};
