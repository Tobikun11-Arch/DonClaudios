import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';
import {env} from '../config/env';
import {ApiError} from '../utils/error';

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

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing authorization header'));
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid authorization header'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.auth = payload;
    return next();
  } catch {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid token'));
  }
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
