import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {ApiError} from '../utils/error';
import {cashierRepository} from '../repositories/cashier.repository';

const ACCESS_COOKIE = 'dc_access_token';

export type JwtPayload = {
  userId: string;
  type?: 'customer' | 'cashier' | 'admin';
};

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export function extractAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header) {
    const [scheme, value] = header.split(' ');
    if (scheme === 'Bearer' && value) {
      return value;
    }
  }
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

export const ACCOUNT_DISABLED_MESSAGE = 'This account is disabled. Ask the owner.';

/**
 * Cashier tokens are checked against the account on every request, so a
 * cashier the owner disabled (or deleted) is cut off at once, not when the
 * 15-minute access token runs out. 401 makes the web and the POS app try a
 * refresh, which is refused too, so both land on the sign-in screen.
 * The same read records the cashier's presence (Online/Offline).
 */
function checkCashier(payload: JwtPayload, onDone: (active: boolean) => void, next: NextFunction) {
  if (payload.type !== 'cashier') return onDone(true);
  cashierRepository.checkActiveAndTouch(payload.userId).then(onDone, next);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractAccessToken(req);

  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing access token'));
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid token'));
  }
  checkCashier(
    payload,
    active => {
      if (!active) return next(new ApiError(401, 'ACCOUNT_DISABLED', ACCOUNT_DISABLED_MESSAGE));
      req.auth = payload;
      next();
    },
    next
  );
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = extractAccessToken(req);
  if (!token) {
    return next();
  }
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    // Ignore invalid/expired token; leave req.auth unset (treat as guest)
    return next();
  }
  checkCashier(
    payload,
    active => {
      // A disabled cashier is treated as a guest here.
      if (active) req.auth = payload;
      next();
    },
    next
  );
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'));
  }

  if (req.auth.type !== 'admin') {
    return next(new ApiError(403, 'FORBIDDEN', 'Admin access required'));
  }

  return next();
}

export function requireCustomer(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.auth) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'));
  }

  if (req.auth.type !== 'customer') {
    return next(
      new ApiError(403, 'FORBIDDEN', 'Customer access required')
    );
  }

  return next();
}

export function requireCashier(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.auth) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'));
  }

  if (req.auth.type !== 'cashier') {
    return next(new ApiError(403, 'FORBIDDEN', 'Cashier access required'));
  }

  return next();
}
