import {Router} from 'express';
import {reportController} from '../controllers/report.controller';
import {requireAuth, requireAdmin} from '../middleware/auth';
import {validateQuery} from '../middleware/validation';
import {
  reportBreakdownQueryDto,
  reportDeliveryHeatmapQueryDto,
  reportPdfQueryDto,
  reportRangeQueryDto,
  reportTimeseriesQueryDto,
  reportDetailQueryDto
} from '../dtos/report.dto';

const router = Router();

router.get(
  '/summary',
  requireAuth,
  requireAdmin,
  validateQuery(reportRangeQueryDto),
  reportController.summary
);

router.get(
  '/timeseries',
  requireAuth,
  requireAdmin,
  validateQuery(reportTimeseriesQueryDto),
  reportController.timeseries
);

router.get(
  '/breakdown',
  requireAuth,
  requireAdmin,
  validateQuery(reportBreakdownQueryDto),
  reportController.breakdown
);

router.get(
  '/operations',
  requireAuth,
  requireAdmin,
  validateQuery(reportRangeQueryDto),
  reportController.operations
);

router.get(
  '/inventory-health',
  requireAuth,
  requireAdmin,
  validateQuery(reportRangeQueryDto),
  reportController.inventoryHealth
);

router.get(
  '/acquisition',
  requireAuth,
  requireAdmin,
  validateQuery(reportRangeQueryDto),
  reportController.acquisition
);

router.get(
  '/delivery-heatmap',
  requireAuth,
  requireAdmin,
  validateQuery(reportDeliveryHeatmapQueryDto),
  reportController.deliveryHeatmap
);

router.get(
  '/detail',
  requireAuth,
  requireAdmin,
  validateQuery(reportDetailQueryDto),
  reportController.detail
);

router.get('/dimensions', requireAuth, requireAdmin, reportController.dimensions);

router.get(
  '/pdf',
  requireAuth,
  requireAdmin,
  validateQuery(reportPdfQueryDto),
  reportController.pdf
);

export default router;
