import {Router} from 'express';
import {ingredientController} from '../controllers/ingredient.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {
  createIngredientDto,
  updateIngredientDto
} from '../dtos/ingredient.dto';

const router = Router();

router.get('/', requireAuth, requireAdmin, ingredientController.list);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createIngredientDto),
  ingredientController.create
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateIngredientDto),
  ingredientController.update
);

router.delete('/:id', requireAuth, requireAdmin, ingredientController.remove);

export default router;