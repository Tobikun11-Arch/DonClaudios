import {Router} from 'express';
import {settingsController} from '../controllers/settings.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.get('/', settingsController.getSettings);

router.put('/', requireAuth, requireAdmin, settingsController.updateSettings);

export default router;
