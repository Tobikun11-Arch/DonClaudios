import {Router} from 'express';
import {reviewController} from '../controllers/review.controller';
import {requireAdmin, requireAuth, requireCustomer} from '../middleware/auth';
import {reviewLimiter} from '../middleware/rateLimit';
import {validate} from '../middleware/validation';
import {
  createReviewDto,
  replyReviewDto,
  updateReviewStatusDto
} from '../dtos/review.dto';

const router = Router();

router.get('/', reviewController.listPublic);

router.get('/my', requireAuth, requireCustomer, reviewController.listMyReviews);

router.get(
  '/eligibility',
  requireAuth,
  requireCustomer,
  reviewController.getEligibility
);

router.get('/admin', requireAuth, requireAdmin, reviewController.listAdmin);

router.post(
  '/',
  requireAuth,
  requireCustomer,
  reviewLimiter,
  validate(createReviewDto),
  reviewController.createReview
);

router.post(
  '/:id/customer-reply',
  requireAuth,
  requireCustomer,
  reviewLimiter,
  validate(replyReviewDto),
  reviewController.customerReply
);

router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  validate(updateReviewStatusDto),
  reviewController.updateStatus
);

router.post(
  '/:id/reply',
  requireAuth,
  requireAdmin,
  validate(replyReviewDto),
  reviewController.reply
);

export default router;
