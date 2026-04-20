import {Router} from 'express';
import {cashierController} from '../controllers/cashier.controller';
import {validate} from '../middleware/validation';
import {createCashierDto} from '../dtos/cashier.dto';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(createCashierDto),
  cashierController.create
);

export default router;
