import {Request, Response, NextFunction} from 'express';
import {CookieOptions} from 'express';
import {authService} from '../services/auth.service';
import {env} from '../config/env';
import {ApiError} from '../utils/error';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';

const ACCESS_COOKIE = 'dc_access_token';
const REFRESH_COOKIE = 'dc_refresh_token';

function getCookieOptions(): CookieOptions {
  const isProduction =
    env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const sameSite =
    process.env.COOKIE_SAMESITE ?? (isProduction ? 'none' : 'lax');
  const secure =
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' && sameSite === 'none');

  return {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'strict' | 'lax' | 'none',
    path: '/'
  };
}

export const authController = {
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      if (!req.auth.type) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token');
      }

      const customer =
        req.auth.type === 'customer'
          ? await customerRepository.findById(req.auth.userId)
          : null;

      const admin =
        req.auth.type === 'admin'
          ? await adminRepository.findById(req.auth.userId)
          : null;

      res.status(200).json({
        user: {
          id: req.auth.userId,
          type: req.auth.type,
          firstName: admin?.firstName ?? customer?.firstName,
          lastName: admin?.lastName ?? customer?.lastName,
          email: admin?.email ?? customer?.email,
          phoneNumber: admin?.phoneNumber ?? customer?.phoneNumber,
          address: admin?.address ?? customer?.address,
          username: admin?.username,
          businessName: admin?.businessName,
          businessLogo: admin?.businessLogo,
          storeAddress: admin?.storeAddress,
          businessContactNumber: admin?.businessContactNumber,
          operatingHours: admin?.operatingHours,
          businessType: admin?.businessType
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth || req.auth.type !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Admin access required');
      }

      const updated = await adminRepository.updateProfile(
        req.auth.userId,
        req.body
      );

      if (!updated) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
      }

      res.status(200).json({
        user: {
          id: updated.id,
          type: 'admin',
          firstName: updated.firstName,
          lastName: updated.lastName,
          email: updated.email,
          phoneNumber: updated.phoneNumber,
          address: updated.address,
          username: updated.username,
          businessName: updated.businessName,
          businessLogo: updated.businessLogo,
          storeAddress: updated.storeAddress,
          businessContactNumber: updated.businessContactNumber,
          operatingHours: updated.operatingHours,
          businessType: updated.businessType
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth || req.auth.type !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Admin access required');
      }

      await authService.changePassword(
        req.auth.userId,
        req.body.currentPassword,
        req.body.newPassword
      );

      res.status(200).json({message: 'Password updated'});
    } catch (error) {
      next(error);
    }
  },

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
          type: userType,
          firstName: 'firstName' in user ? user.firstName : undefined,
          lastName: 'lastName' in user ? user.lastName : undefined,
          phoneNumber: 'phoneNumber' in user ? user.phoneNumber : undefined,
          address: 'address' in user ? user.address : undefined
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
      const opts = getCookieOptions();
      res.clearCookie(ACCESS_COOKIE, opts);
      res.clearCookie(REFRESH_COOKIE, opts);
      next(error);
    }
  },

  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      const opts = getCookieOptions();
      res.clearCookie(ACCESS_COOKIE, opts);
      res.clearCookie(REFRESH_COOKIE, opts);
      res.status(200).json({message: 'Logged out'});
    } catch (error) {
      next(error);
    }
  },

  async sessions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth || req.auth.type !== 'admin') {
        throw new ApiError(403, 'FORBIDDEN', 'Admin access required');
      }

      res.status(200).json({
        sessions: [
          {
            device: 'This device',
            location: 'Current session',
            lastActive: new Date().toISOString(),
            isCurrent: true
          }
        ]
      });
    } catch (error) {
      next(error);
    }
  }
};
