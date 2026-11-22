import {Router} from 'express';
import {categoryController} from '../controllers/category.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {publicCache} from '../middleware/publicCache';
import {
  createCategoryDto,
  reorderCategoriesDto,
  updateCategoryDto
} from '../dtos/category.dto';

const router = Router();

router.get('/', requireAuth, categoryController.list);

router.get('/public', publicCache(60), categoryController.list);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createCategoryDto),
  categoryController.create
);

// Before '/:id' so "order" is not read as a category id.
router.put(
  '/order',
  requireAuth,
  requireAdmin,
  validate(reorderCategoriesDto),
  categoryController.reorder
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