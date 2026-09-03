import {Router} from 'express';
import {orderController} from '../controllers/order.controller';
import {orderMessageController} from '../controllers/orderMessage.controller';
import {requireAuth, requireCustomer} from '../middleware/auth';
import {ApiError} from '../utils/error';
import type {Request, Response, NextFunction} from 'express';

const router = Router();

function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.type === 'admin' || req.auth?.type === 'cashier') {
    return next();
  }
  return next(new ApiError(403, 'FORBIDDEN', 'Admin or cashier access required'));
}

router.post('/me', requireAuth, orderController.createCustomerOrder);
router.get('/me', requireAuth, orderController.listMyOrders);
router.post('/guest', orderController.createGuestOrder);
router.get('/all', requireAuth, requireStaff, orderController.listAllOrders);
router.get('/:id', requireAuth, requireStaff, orderController.getOrderById);
router.patch(
  '/:id/status',
  requireAuth,
  requireStaff,
  orderController.updateStatus
);

router.get(
  '/follow-up',
  requireAuth,
  requireStaff,
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
  requireStaff,
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
  requireStaff,
  orderMessageController.sendByAdmin
);

export default router;
