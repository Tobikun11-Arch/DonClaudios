import {Router} from 'express';
import {settingsController} from '../controllers/settings.controller';
import {requireAdmin, requireAuth} from '../middleware/auth';
import {validate} from '../middleware/validation';
import {dashboardThemeDto, freeDeliveryDto, rewardsEarnDto} from '../dtos/settings.dto';

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

// Loyalty earn rule (points per pesos). Public read so the customer Rewards
// tab can show the live rate; only the owner can change it.
router.get('/rewards-earn', settingsController.getRewardsEarn);

router.put(
  '/rewards-earn',
  requireAuth,
  requireAdmin,
  validate(rewardsEarnDto),
  settingsController.updateRewardsEarn
);

// Owner, cashier and customer dashboard colors. Read through GET /settings (dashboardTheme),
// so dashboards need no extra request; only the owner can change them.
router.put(
  '/dashboard-theme',
  requireAuth,
  requireAdmin,
  validate(dashboardThemeDto),
  settingsController.updateDashboardTheme
);

router.get('/notification-preferences', requireAuth, requireAdmin, settingsController.getNotificationPreferences);

router.put('/notification-preferences', requireAuth, requireAdmin, settingsController.updateNotificationPreferences);

export default router;
