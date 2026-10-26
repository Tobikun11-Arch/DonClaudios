import {Router} from 'express';
import multer from 'multer';
import {orderController} from '../controllers/order.controller';
import {orderMessageController} from '../controllers/orderMessage.controller';
import {
  requireAuth,
  requireCustomer,
  requireCashier,
  optionalAuth
} from '../middleware/auth';
import {ApiError} from '../utils/error';
import {validate, validateQuery} from '../middleware/validation';
import {guestOtpLimiter} from '../middleware/rateLimit';
import {
  guestOtpSendDto,
  guestOtpVerifyDto,
  listAllOrdersQueryDto
} from '../dtos/order.dto';
import type {Request, Response, NextFunction} from 'express';

const router = Router();

/**
 * Order endpoint map (keep these distinct):
 *  - /orders/me          -> account customers (auth). Server cart -> order.
 *  - /orders/guest       -> guests (no auth). Requires phone OTP. No pre-orders,
 *                          no rewards. Stock reserved at placement.
 *  - /orders/all         -> staff queue of ONLINE orders only (excludes in-store).
 *  - /orders/counter     -> in-store (walk-in) orders, created as completed.
 *  - /orders/customer/track/:id -> tracking; guest needs ?phoneNumber=.
 * In-store orders are deliberately excluded from /orders/all so the live queue
 * is not buried under completed counter sales. Use /orders/counter for those.
 */

function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.type === 'admin' || req.auth?.type === 'cashier') {
    return next();
  }
  return next(new ApiError(403, 'FORBIDDEN', 'Admin or cashier access required'));
}

router.post('/me', requireAuth, orderController.createCustomerOrder);
router.get('/me', requireAuth, orderController.listMyOrders);
router.post('/guest', orderController.createGuestOrder);

router.get(
  '/guest/otp/status',
  guestOtpLimiter,
  orderController.checkGuestOtpStatus
);
router.post(
  '/guest/otp',
  guestOtpLimiter,
  validate(guestOtpSendDto),
  orderController.sendGuestOtp
);
router.post(
  '/guest/otp/verify',
  guestOtpLimiter,
  validate(guestOtpVerifyDto),
  orderController.verifyGuestOtp
);

// Idempotent overdue check, invoked by the Vercel cron (and safe to call
// manually). The atomic latch inside notifyOverdueOrder prevents duplicates.
router.get('/overdue-check', orderController.checkOverdueOrders);

router.get(
  '/customer/track/:id',
  optionalAuth,
  orderController.trackOrder
);
router.post(
  '/customer/track/:id/cancel',
  optionalAuth,
  orderController.cancelOrder
);

// MANUAL PAYMENT flow (step 1 — customer): available only while the order is
// confirmed and not yet verified. Guests identify themselves with the order's
// phone number (query or body), customers with their JWT; the screenshot is
// uploaded in the same multipart call and stored on Cloudinary.
const paymentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 5 * 1024 * 1024}
});
router.post(
  '/:id/payment',
  optionalAuth,
  paymentUpload.single('proof'),
  orderController.submitPayment
);
// Step 2 — staff: mark the submitted payment as verified (or rejected).
router.patch(
  '/:id/payment/verify',
  requireAuth,
  requireStaff,
  orderController.verifyPayment
);
router.get(
  '/all',
  requireAuth,
  requireStaff,
  validateQuery(listAllOrdersQueryDto),
  orderController.listAllOrders
);

router.get(
  '/counter',
  requireAuth,
  requireStaff,
  validateQuery(listAllOrdersQueryDto),
  orderController.listCounterOrders
);
router.post(
  '/counter',
  requireAuth,
  requireCashier,
  orderController.createCounterOrder
);
router.post(
  '/counter/:id/void',
  requireAuth,
  requireCashier,
  orderController.voidCounterOrder
);
router.patch(
  '/counter/:id/mark-paid',
  requireAuth,
  requireStaff,
  orderController.markCounterOrderPaid
);
router.patch(
  '/counter/:id',
  requireAuth,
  requireStaff,
  orderController.updateCounterOrder
);

router.get('/:id', requireAuth, requireStaff, orderController.getOrderById);
router.patch(
  '/:id/status',
  requireAuth,
  requireStaff,
  orderController.updateStatus
);

router.get(
  '/follow-up',
  requireAuth,
  requireStaff,
  orderMessageController.listFollowUpOrders
);
router.get(
  '/:id/messages',
  requireAuth,
  requireCustomer,
  orderMessageController.listForCustomer
);
router.get(
  '/:id/messages/admin',
  requireAuth,
  requireStaff,
  orderMessageController.listForAdmin
);
router.post(
  '/:id/messages',
  requireAuth,
  requireCustomer,
  orderMessageController.sendByCustomer
);
router.post(
  '/:id/messages/admin',
  requireAuth,
  requireStaff,
  orderMessageController.sendByAdmin
);

export default router;
