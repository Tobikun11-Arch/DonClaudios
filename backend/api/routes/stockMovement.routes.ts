import {Router} from 'express';
import {stockMovementController} from '../controllers/stockMovement.controller';
import {validate} from '../middleware/validation';
import {restockDto, adjustDto} from '../dtos/stockMovement.dto';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.patch(
  '/:productId/restock',
  requireAuth,
  requireAdmin,
  validate(restockDto),
  stockMovementController.restock
);

router.patch(
  '/:productId/adjust',
  requireAuth,
  requireAdmin,
  validate(adjustDto),
  stockMovementController.adjust
);

router.get(
  '/movements',
  requireAuth,
  requireAdmin,
  stockMovementController.listMovements
);

export default router;
