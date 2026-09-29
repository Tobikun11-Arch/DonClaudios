import {z} from 'zod';
import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';

export const validate =
  (schema: z.ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const flattened = result.error.flatten();
      const firstFieldError = Object.values(flattened.fieldErrors)
        .flat()
        .filter(Boolean)[0];
      const firstFormError = flattened.formErrors.filter(Boolean)[0];
      const message = firstFieldError ?? firstFormError ?? 'Invalid request';

      return next(new ApiError(400, 'VALIDATION_ERROR', message, flattened));
    }

    next();
  };

/** Query params land on a separate property so `req.query` is never overwritten. */
export const validateQuery =
  (schema: z.ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const flattened = result.error.flatten();
      const firstFieldError = Object.values(flattened.fieldErrors)
        .flat()
        .filter(Boolean)[0];
      const firstFormError = flattened.formErrors.filter(Boolean)[0];
      const message = firstFieldError ?? firstFormError ?? 'Invalid query';

      return next(new ApiError(400, 'VALIDATION_ERROR', message, flattened));
    }

    (req as ValidatedRequest).validatedQuery = result.data;
    next();
  };

export interface ValidatedRequest extends Request {
  validatedQuery?: unknown;
}
