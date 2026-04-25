import {Request, Response, NextFunction} from 'express';
import {CookieOptions} from 'express';
import {authService} from '../services/auth.service';
import {env} from '../config/env';
import {ApiError} from '../utils/error';

const ACCESS_COOKIE = 'dc_access_token';
const REFRESH_COOKIE = 'dc_refresh_token';

function getCookieOptions(): CookieOptions {
  const isProd = env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd, // true only in prod
    sameSite: isProd ? 'none' : 'strict', // union type matches
    path: '/'
  };
}

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
      const {accessToken, refreshToken, user, userType} =
        await authService.login(req.body.email, req.body.password);

      const opts = getCookieOptions();

      res.cookie(ACCESS_COOKIE, accessToken, {
        ...opts,
        maxAge: 15 * 60 * 1000
      });
      res.cookie(REFRESH_COOKIE, refreshToken, {
        ...opts,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(200).json({
        user: {
          id: user._id.toString(),
          email: user.email,
          type: userType
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken =
        (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
        (req.body.refreshToken as string | undefined);

      if (!refreshToken) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Missing refresh token');
      }

      const result = await authService.refreshAccessToken(refreshToken);

      const opts = getCookieOptions();
      res.cookie(ACCESS_COOKIE, result.accessToken, {
        ...opts,
        maxAge: 15 * 60 * 1000
      });

      res.status(200).json({message: 'Refreshed'});
    } catch (error) {
      res.clearCookie(ACCESS_COOKIE, {path: '/'});
      res.clearCookie(REFRESH_COOKIE, {path: '/'});
      next(error);
    }
  },

  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie(ACCESS_COOKIE, {path: '/'});
      res.clearCookie(REFRESH_COOKIE, {path: '/'});
      res.status(200).json({message: 'Logged out'});
    } catch (error) {
      next(error);
    }
  }
};
