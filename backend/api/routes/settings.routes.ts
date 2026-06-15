import {Router} from 'express';
import {settingsController} from '../controllers/settings.controller';
import {requireAuth, requireAdmin} from '../middleware/auth';

const router = Router();

router.get('/', settingsController.get);
router.put('/', requireAuth, requireAdmin, settingsController.update);

export default router;
