import {Router} from 'express';
import {dashboardController} from '../controllers/dashboard.controller';
import {requireAuth, requireAdmin} from '../middleware/auth';

const router = Router();

router.get('/summary', requireAuth, requireAdmin, dashboardController.summary);
router.get('/sales-trend', requireAuth, requireAdmin, dashboardController.salesTrend);
router.get('/inventory-by-category', requireAuth, requireAdmin, dashboardController.inventoryByCategory);
router.get('/top-products', requireAuth, requireAdmin, dashboardController.topProducts);
router.get('/low-stock', requireAuth, requireAdmin, dashboardController.lowStock);

export default router;
