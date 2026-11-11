import {Router} from 'express';
import {z} from 'zod';
import {Request, Response, NextFunction} from 'express';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {ApiError} from '../utils/error';
import {ALLERGEN_KINDS} from '../models/Allergen.model';
import {allergenService} from '../services/allergen.service';

const createAllergenDto = z.object({
  label: z.string().trim().min(2).max(30),
  kind: z.enum(ALLERGEN_KINDS).optional()
});

const router = Router();

// Public: customers need the labels to read allergen chips on the menu.
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({allergens: await allergenService.list()});
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createAllergenDto),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      const allergen = await allergenService.create(req.auth.userId, req.body);
      res.status(201).json({allergen});
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await allergenService.remove(req.params.id));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
