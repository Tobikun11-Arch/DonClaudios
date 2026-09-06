import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {ApiError} from '../utils/error';

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

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractAccessToken(req);

  if (!token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing access token'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.auth = payload;
    return next();
  } catch {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid token'));
  }
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
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.auth = payload;
  } catch {
    // Ignore invalid/expired token; leave req.auth unset (treat as guest)
  }
  return next();
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
