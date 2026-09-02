import {Router} from 'express';
import {orderController} from '../controllers/order.controller';
import {orderMessageController} from '../controllers/orderMessage.controller';
import {requireAdmin, requireAuth, requireCustomer} from '../middleware/auth';

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

router.get(
  '/follow-up',
  requireAuth,
  requireAdmin,
  orderMessageController.listFollowUpOrders
);
router.get(
  '/:id/messages',
  requireAuth,
  requireCustomer,
  orderMessageController.listForCustomer
);
router.get(
  '/:id/messages/admin',
  requireAuth,
  requireAdmin,
  orderMessageController.listForAdmin
);
router.post(
  '/:id/messages',
  requireAuth,
  requireCustomer,
  orderMessageController.sendByCustomer
);
router.post(
  '/:id/messages/admin',
  requireAuth,
  requireAdmin,
  orderMessageController.sendByAdmin
);

export default router;
