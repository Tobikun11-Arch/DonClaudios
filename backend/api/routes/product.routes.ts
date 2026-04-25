import {Router} from 'express';
import {productController} from '../controllers/product.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {createProductDto, updateProductDto} from '../dtos/product.dto';

const router = Router();

router.get('/', productController.list);
router.get('/:id', productController.getById);

router.post('/', requireAuth, requireAdmin, validate(createProductDto), productController.create);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateProductDto),
  productController.update
);

router.delete('/:id', requireAuth, requireAdmin, productController.remove);

export default router;
