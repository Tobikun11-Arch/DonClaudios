import {Router} from 'express';
import {settingsController} from '../controllers/settings.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';

const router = Router();

router.get('/', settingsController.getSettings);

router.put('/', requireAuth, requireAdmin, settingsController.updateSettings);

router.get('/notification-preferences', requireAuth, requireAdmin, settingsController.getNotificationPreferences);

router.put('/notification-preferences', requireAuth, requireAdmin, settingsController.updateNotificationPreferences);

export default router;
