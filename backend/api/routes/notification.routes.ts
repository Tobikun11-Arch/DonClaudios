import {Router} from 'express';
import {notificationController} from '../controllers/notification.controller';
import {
  requireAdmin,
  requireAuth,
  requireCashier,
  requireCustomer
} from '../middleware/auth';

const router = Router();

router.get(
  '/cashier',
  requireAuth,
  requireCashier,
  notificationController.listCashierNotifications
);

router.patch(
  '/cashier/read-all',
  requireAuth,
  requireCashier,
  notificationController.markAllReadCashier
);

router.patch(
  '/cashier/:id/read',
  requireAuth,
  requireCashier,
  notificationController.markReadCashier
);

router.delete(
  '/cashier/:id',
  requireAuth,
  requireCashier,
  notificationController.removeCashier
);

router.get(
  '/admin',
  requireAuth,
  requireAdmin,
  notificationController.listAdminNotifications
);

router.patch(
  '/admin/read-all',
  requireAuth,
  requireAdmin,
  notificationController.markAllReadAdmin
);

router.patch(
  '/admin/:id/read',
  requireAuth,
  requireAdmin,
  notificationController.markReadAdmin
);

router.delete(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  notificationController.removeAdmin
);

router.get(
  '/',
  requireAuth,
  requireCustomer,
  notificationController.listMyNotifications
);

router.patch(
  '/read-all',
  requireAuth,
  requireCustomer,
  notificationController.markAllRead
);

router.patch(
  '/:id/read',
  requireAuth,
  requireCustomer,
  notificationController.markRead
);

router.delete(
  '/:id',
  requireAuth,
  requireCustomer,
  notificationController.remove
);

export default router;
