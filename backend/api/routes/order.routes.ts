import {Router} from 'express';
import {orderController} from '../controllers/order.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.post('/me', requireAuth, orderController.createCustomerOrder);
router.get('/me', requireAuth, orderController.listMyOrders);
router.post('/guest', orderController.createGuestOrder);
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  orderController.updateStatus
);

export default router;
