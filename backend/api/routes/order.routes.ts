import {Router} from 'express';
import {orderController} from '../controllers/order.controller';

const router = Router();

router.post('/guest', orderController.createGuestOrder);

export default router;
