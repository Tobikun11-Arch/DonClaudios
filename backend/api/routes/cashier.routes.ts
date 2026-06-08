import {Router} from 'express';
import {cashierController} from '../controllers/cashier.controller';
import {validate} from '../middleware/validation';
import {createCashierDto, updateCashierDto} from '../dtos/cashier.dto';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.get('/', cashierController.list);
router.get('/:id', cashierController.getById);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createCashierDto),
  cashierController.create
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(updateCashierDto),
  cashierController.update
);

router.delete('/:id', requireAuth, requireAdmin, cashierController.remove);

export default router;
