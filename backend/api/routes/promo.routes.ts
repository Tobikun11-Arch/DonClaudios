import {Router} from 'express';
import {promoController} from '../controllers/promo.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {createPromoDto, updatePromoDto} from '../dtos/promo.dto';

const router = Router();

router.get('/', promoController.list);
router.get('/:id', promoController.getById);

router.post('/', requireAuth, requireAdmin, validate(createPromoDto), promoController.create);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updatePromoDto),
  promoController.update
);

router.delete('/:id', requireAuth, requireAdmin, promoController.remove);

export default router;
