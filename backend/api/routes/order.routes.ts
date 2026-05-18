import {Router} from 'express';
import {orderController} from '../controllers/order.controller';
import {requireAuth} from '../middleware/auth';

const router = Router();

router.post('/me', requireAuth, orderController.createCustomerOrder);
router.get('/me', requireAuth, orderController.listMyOrders);
router.post('/guest', orderController.createGuestOrder);

export default router;
