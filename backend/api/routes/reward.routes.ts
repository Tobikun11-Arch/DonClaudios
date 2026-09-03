import {Router} from 'express';
import {rewardController} from '../controllers/reward.controller';
import {requireAuth, requireCustomer} from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, requireCustomer, rewardController.getRewards);
router.post('/redeem', requireAuth, requireCustomer, rewardController.redeem);

export default router;
