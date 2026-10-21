import {Router} from 'express';
import {pushController} from '../controllers/push.controller';
import {optionalAuth, requireAuth, requireAdmin} from '../middleware/auth';

const router = Router();

router.post('/subscribe', optionalAuth, pushController.subscribe);
router.post('/unsubscribe', optionalAuth, pushController.unsubscribe);
router.post('/send', requireAuth, requireAdmin, pushController.send);

export default router;
