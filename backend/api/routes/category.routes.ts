import {Router} from 'express';
import {categoryController} from '../controllers/category.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {createCategoryDto, updateCategoryDto} from '../dtos/category.dto';

const router = Router();

router.get('/', requireAuth, categoryController.list);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createCategoryDto),
  categoryController.create
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateCategoryDto),
  categoryController.update
);

router.delete('/:id', requireAuth, requireAdmin, categoryController.remove);

export default router;