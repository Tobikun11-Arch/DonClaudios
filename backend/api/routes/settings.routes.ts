import {Router} from 'express';
import {settingsController} from '../controllers/settings.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {freeDeliveryDto} from '../dtos/settings.dto';

const router = Router();

router.get('/', settingsController.getSettings);

router.put('/', requireAuth, requireAdmin, settingsController.updateSettings);

// Free delivery (minimum order + Tanza zone). Public read so checkout can
// show the zone; only the owner can change it.
router.get('/free-delivery', settingsController.getFreeDelivery);

router.put(
  '/free-delivery',
  requireAuth,
  requireAdmin,
  validate(freeDeliveryDto),
  settingsController.updateFreeDelivery
);

router.get('/notification-preferences', requireAuth, requireAdmin, settingsController.getNotificationPreferences);

router.put('/notification-preferences', requireAuth, requireAdmin, settingsController.updateNotificationPreferences);

export default router;
