import {Router} from 'express';
import {requireAuth} from '../middleware/auth';
import {cartController} from '../controllers/cart.controller';

const router = Router();

router.get('/me', requireAuth, cartController.getMyCart);
router.post('/items', requireAuth, cartController.addItem);
router.patch('/items/:productId', requireAuth, cartController.setQuantity);
router.delete('/items/:productId', requireAuth, cartController.removeItem);
router.delete('/me', requireAuth, cartController.clear);

export default router;
