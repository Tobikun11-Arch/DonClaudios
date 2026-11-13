import {Router} from 'express';
import {productController} from '../controllers/product.controller';
import {requireAdmin, requireAuth, optionalAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {publicCache} from '../middleware/publicCache';
import {createProductDto, updateProductDto} from '../dtos/product.dto';

const router = Router();

// optionalAuth (not requireAuth) so the handler can tell a guest from a
// signed-in customer and hide pre-order products from guests.
router.get('/', optionalAuth, productController.list);
// Before '/:id' so "best-sellers" is not read as a product id.
router.get('/best-sellers', publicCache(300), productController.bestSellers);
router.get('/:id', optionalAuth, productController.getById);

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
