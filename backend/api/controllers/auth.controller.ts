import {Request, Response, NextFunction} from 'express';
import {CookieOptions} from 'express';
import {authService} from '../services/auth.service';
import {env} from '../config/env';
import {ApiError} from '../utils/error';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {cashierService} from '../services/cashier.service';
import {CustomerModel, type CustomerDocument} from '../models/Customer.model';
import type {CashierDocument} from '../models/Cashier.model';
import jwt from 'jsonwebtoken';
import {extractAccessToken} from '../middleware/auth';
import {signSessionTokens, accountSecurityService, needsPhoneVerification} from '../services/accountSecurity.service';
import {staffActivityService} from '../services/staffActivity.service';
import {lookupUserName} from '../utils/actor';

const ACCESS_COOKIE = 'dc_access_token';
const REFRESH_COOKIE = 'dc_refresh_token';

/** The Expo cashier app sends `X-Client: mobile` on login and refresh. */
export function isMobileClient(req: Request): boolean {
  return req.get('x-client') === 'mobile';
}

export function getCookieOptions(): CookieOptions {
  const isProduction =
    env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const rawSameSite =
    process.env.COOKIE_SAMESITE ?? (isProduction ? 'none' : 'lax');
  // Never use 'strict': it drops cookies on top-level navigations (e.g. email
  // verification / reset-password links) and breaks auth flows. Coerce to lax.
  const sameSite = rawSameSite === 'strict' ? 'lax' : rawSameSite;
  // In production cookies must be Secure when SameSite=None (browsers reject
  // SameSite=None without Secure). Force Secure in production to avoid a
  // misconfigured COOKIE_SECURE=false breaking login in the installed PWA.
  const secure =
    isProduction ||
    process.env.COOKIE_SECURE === 'true' ||
    (process.env.COOKIE_SECURE !== 'false' && sameSite === 'none');

  return {
    httpOnly: true,
    secure,
    sameSite: sameSite as 'strict' | 'lax' | 'none',
    path: '/'
  };
}

/**
 * Last step of every sign-in (password, Google, or after the MFA code): sets
 * the session cookies, logs cashier sign-ins for the owner, and answers with
 * the user (plus the tokens for the mobile POS).
 */
export async function completeSignIn(
  req: Request,
  res: Response,
  user: any,
  userType: 'customer' | 'cashier' | 'admin',
  extra: Record<string, unknown> = {}
) {
  const {accessToken, refreshToken} = signSessionTokens(String(user._id ?? user.id), userType);
  const opts = getCookieOptions();
  res.cookie(ACCESS_COOKIE, accessToken, {...opts, maxAge: 15 * 60 * 1000});
  res.cookie(REFRESH_COOKIE, refreshToken, {...opts, maxAge: 7 * 24 * 60 * 60 * 1000});

  if (userType === 'cashier') {
    await staffActivityService.recordSession(
      {
        id: String(user._id),
        type: 'cashier',
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
      },
      'login',
      req
    );
  }

  res.status(200).json({
    user: {
      id: String(user._id),
      email: user.email,
      type: userType,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      address: user.address
    },
    ...extra,
    // Native apps cannot rely on httpOnly cookies; they ask for the
    // tokens in the body and keep them in the device's secure store.
    ...(isMobileClient(req) ? {accessToken, refreshToken} : {})
  });
}

/** Who a sign-out belongs to (logout needs no valid access token). */
function sessionOwner(req: Request): {userId: string; type?: string} | null {
  const tryVerify = (token: string | undefined, secret: string) => {
    if (!token) return null;
    try {
      return jwt.verify(token, secret, {ignoreExpiration: true}) as {userId: string; type?: string};
    } catch {
      return null;
    }
  };
  return (
    tryVerify(extractAccessToken(req), env.JWT_SECRET) ??
    tryVerify(req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken, env.JWT_REFRESH_SECRET)
  );
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

      const cashier =
        req.auth.type === 'cashier'
          ? await cashierRepository.findById(req.auth.userId)
          : null;

      res.status(200).json({
        user: {
          id: req.auth.userId,
          type: req.auth.type,
          firstName: admin?.firstName ?? customer?.firstName ?? cashier?.firstName,
          lastName: admin?.lastName ?? customer?.lastName ?? cashier?.lastName,
          email: admin?.email ?? customer?.email ?? cashier?.email,
          phoneNumber:
            admin?.phoneNumber ?? customer?.phoneNumber ?? cashier?.phoneNumber,
          address: admin?.address ?? customer?.address ?? cashier?.address,
          username: admin?.username ?? cashier?.username,
          profilePhoto:
            admin?.profilePhoto ?? customer?.profilePhoto ?? cashier?.profilePhoto,
          createdAt:
            (customer as any)?.createdAt ??
            (admin as any)?.createdAt ??
            (cashier as any)?.createdAt,
          addresses: customer?.addresses ?? [],
          preferences: customer?.preferences ?? {},
          occasions: customer?.occasions ?? [],
          // First-login dashboard guide: shown until finished or skipped once.
          onboardingTourDone: customer ? !!customer.onboardingTourDoneAt : true,
          // Account & security (customers only).
          ...(customer
            ? {
                phoneVerified: customer.phoneVerified === true,
                needsPhoneVerification: needsPhoneVerification(customer),
                orderEmailUpdates: customer.orderEmailUpdates !== false,
                googleLinked: !!customer.googleId,
                googleEmail: customer.googleEmail ?? null,
                hasPassword: !!customer.passwordHash,
                mfaEnabled: customer.mfa?.enabled === true,
                mfaMethod: customer.mfa?.enabled ? customer.mfa.method ?? 'email' : null,
                backupCodesLeft: customer.mfa?.enabled ? customer.mfa.backupCodes?.length ?? 0 : 0
              }
            : {}),
          businessName: admin?.businessName,
          businessLogo: admin?.businessLogo,
          storeAddress: admin?.storeAddress,
          businessContactNumber: admin?.businessContactNumber,
          operatingHours: admin?.operatingHours,
          businessType: admin?.businessType,
          openingTime: admin?.openingTime,
          closingTime: admin?.closingTime,
          advanceCloseMinutes: admin?.advanceCloseMinutes,
          defaultPrepMinutes: admin?.defaultPrepMinutes,
          isManuallyClosed: admin?.isManuallyClosed,
          isManuallyOpen: admin?.isManuallyOpen,
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /** Customer finished or skipped the dashboard guide: never auto-show again. */
  async completeOnboardingTour(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      if (!req.auth || req.auth.type !== 'customer') {
        throw new ApiError(403, 'FORBIDDEN', 'Customer access required');
      }
      const outcome =
        req.body?.outcome === 'skipped' ? 'skipped' : 'completed';
      await CustomerModel.updateOne(
        {_id: req.auth.userId},
        {onboardingTourDoneAt: new Date(), onboardingTourOutcome: outcome}
      );
      res.status(200).json({onboardingTourDone: true, outcome});
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const allowedCustomerFields: (keyof CustomerDocument)[] = [
        'firstName',
        'lastName',
        'phoneNumber',
        'address',
        'profilePhoto',
        'addresses',
        'preferences',
        'occasions'
      ];

      if (req.auth.type === 'admin') {
        const updated = await adminRepository.updateProfile(
          req.auth.userId,
          req.body
        );

        if (!updated) {
          throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
        }

        return res.status(200).json({
          user: {
            id: updated.id,
            type: 'admin',
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phoneNumber: updated.phoneNumber,
            address: updated.address,
            username: updated.username,
            profilePhoto: updated.profilePhoto,
            businessName: updated.businessName,
            businessLogo: updated.businessLogo,
            storeAddress: updated.storeAddress,
            businessContactNumber: updated.businessContactNumber,
            operatingHours: updated.operatingHours,
            businessType: updated.businessType,
            openingTime: updated.openingTime,
            closingTime: updated.closingTime,
            advanceCloseMinutes: updated.advanceCloseMinutes,
            defaultPrepMinutes: updated.defaultPrepMinutes,
            isManuallyClosed: updated.isManuallyClosed,
            isManuallyOpen: updated.isManuallyOpen,
          }
        });
      }

      if (req.auth.type === 'customer') {
        const patch: Partial<CustomerDocument> = {};
        for (const key of allowedCustomerFields) {
          if (key in req.body) {
            (patch as Record<string, unknown>)[key] = req.body[key];
          }
        }

        const updated = await customerRepository.updateProfile(
          req.auth.userId,
          patch
        );

        if (!updated) {
          throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
        }

        const user = await customerRepository.findById(req.auth.userId);
        if (!user) {
          throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
        }

        return res.status(200).json({
          user: {
            id: user.id,
            type: 'customer',
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            address: user.address,
            profilePhoto: user.profilePhoto,
            addresses: user.addresses ?? [],
            preferences: user.preferences ?? {},
            occasions: user.occasions ?? []
          }
        });
      }

      if (req.auth.type === 'cashier') {
        const allowedCashierFields: (keyof CashierDocument)[] = [
          'firstName',
          'lastName',
          'phoneNumber',
          'address',
          'username',
          'email',
          'profilePhoto'
        ];
        const patch: Partial<CashierDocument> = {};
        for (const key of allowedCashierFields) {
          if (key in req.body) {
            (patch as Record<string, unknown>)[key] = req.body[key];
          }
        }

        if (patch.email !== undefined) {
          patch.email = (patch.email as string).toLowerCase();
          const existingEmail = await cashierRepository.findByEmail(
            patch.email as string
          );
          if (existingEmail && String(existingEmail._id) !== req.auth.userId) {
            throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
          }
        }

        if (patch.username !== undefined) {
          const existingUsername = await cashierRepository.findByUsername(
            patch.username as string
          );
          if (
            existingUsername &&
            String(existingUsername._id) !== req.auth.userId
          ) {
            throw new ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
          }
        }

        const updated = await cashierRepository.updateProfile(
          req.auth.userId,
          patch
        );

        if (!updated) {
          throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
        }

        return res.status(200).json({
          user: {
            id: updated.id,
            type: 'cashier',
            firstName: updated.firstName,
            lastName: updated.lastName,
            email: updated.email,
            phoneNumber: updated.phoneNumber,
            address: updated.address,
            username: updated.username,
            profilePhoto: updated.profilePhoto
          }
        });
      }

      throw new ApiError(403, 'FORBIDDEN', 'Permission denied');
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (
        !req.auth ||
        (req.auth.type !== 'admin' &&
          req.auth.type !== 'cashier' &&
          req.auth.type !== 'customer')
      ) {
        throw new ApiError(403, 'FORBIDDEN', 'Permission denied');
      }

      const tokens = await authService.changePassword(
        req.auth.userId,
        req.auth.type,
        req.body.currentPassword,
        req.body.newPassword
      );

      // Other devices are signed out; this one gets fresh cookies.
      const opts = getCookieOptions();
      res.cookie(ACCESS_COOKIE, tokens.accessToken, {
        ...opts,
        maxAge: 15 * 60 * 1000
      });
      res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
        ...opts,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

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
      await authService.verify(req.body.phoneNumber, req.body.code);
      res.status(200).json({message: 'Verified'});
    } catch (error) {
      next(error);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resendVerification(req.body.phoneNumber);
      res.status(200).json({message: 'Verification code resent'});
    } catch (error) {
      next(error);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.verifyEmail(req.body.email, req.body.code);
      res.status(200).json({message: 'Verified'});
    } catch (error) {
      next(error);
    }
  },

  async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resendVerificationEmail(req.body.email);
      res.status(200).json({message: 'Verification code resent'});
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.forgotPassword(req.body.email);
      res.status(200).json({
        message: 'If that email exists, a reset code has been sent'
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resetPassword(
        req.body.email,
        req.body.code,
        req.body.newPassword
      );
      res.status(200).json({message: 'Password reset'});
    } catch (error) {
      next(error);
    }
  },

  async verifyResetCode(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.verifyResetCode(req.body.email, req.body.code);
      res.status(200).json({message: 'Code verified'});
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const {user, userType} = await authService.login(req.body.email, req.body.password);

      // Two-step sign-in: no session yet, just a short-lived challenge.
      if (accountSecurityService.isMfaOn(user, userType)) {
        res.status(200).json(await accountSecurityService.beginSignInChallenge(user));
        return;
      }

      await completeSignIn(req, res, user, userType);
    } catch (error) {
      next(error);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      // Mobile sends its stored token in the body. Prefer it: a native cookie
      // jar may still hold the original (never rotated) login cookie.
      const bodyToken = req.body?.refreshToken as string | undefined;
      const refreshToken = isMobileClient(req) && bodyToken
        ? bodyToken
        : (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? bodyToken;

      if (!refreshToken) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Missing refresh token');
      }

      const result = await authService.refreshAccessToken(refreshToken);

      const opts = getCookieOptions();
      res.cookie(ACCESS_COOKIE, result.accessToken, {
        ...opts,
        maxAge: 15 * 60 * 1000
      });

      if (isMobileClient(req)) {
        // Sliding session for the POS: a device that comes online at least
        // once a week never has to sign in again.
        res.status(200).json({
          message: 'Refreshed',
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        });
        return;
      }

      res.status(200).json({message: 'Refreshed'});
    } catch (error) {
      const opts = getCookieOptions();
      res.clearCookie(ACCESS_COOKIE, opts);
      res.clearCookie(REFRESH_COOKIE, opts);
      next(error);
    }
  },

  /** POST /auth/heartbeat: a signed-in cashier app is open (see utils/presence). */
  async heartbeat(req: Request, res: Response, next: NextFunction) {
    try {
      await cashierService.heartbeat(req.auth!.userId);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = sessionOwner(req);
      if (owner?.type === 'cashier' && owner.userId) {
        await staffActivityService.recordSession(
          {id: owner.userId, type: 'cashier', name: await lookupUserName('cashier', owner.userId)},
          'logout',
          req
        );
      }
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
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth || req.auth.type !== 'customer') {
        throw new ApiError(403, 'FORBIDDEN', 'Permission denied');
      }
      await authService.deleteCustomerAccount(req.auth.userId, req.body.password);

      // The account is gone: end this session too.
      const opts = getCookieOptions();
      res.clearCookie(ACCESS_COOKIE, opts);
      res.clearCookie(REFRESH_COOKIE, opts);
      res.status(200).json({message: 'Account deleted'});
    } catch (error) {
      next(error);
    }
  },

  async downloadData(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth || req.auth.type !== 'customer') {
        throw new ApiError(403, 'FORBIDDEN', 'Permission denied');
      }
      const data = await authService.exportCustomerData(req.auth.userId);
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="donclaudios-my-data-${stamp}.json"`
      );
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
};
