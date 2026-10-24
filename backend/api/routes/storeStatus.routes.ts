import {Router} from 'express';
import {storeStatusController} from '../controllers/storeStatus.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.get('/', storeStatusController.getStoreStatus);

router.put('/', requireAuth, requireAdmin, storeStatusController.updateStoreSettings);

router.patch('/manual', requireAuth, requireAdmin, storeStatusController.toggleManualClose);
router.patch('/manual-open', requireAuth, requireAdmin, storeStatusController.toggleManualOpen);
export default router;
