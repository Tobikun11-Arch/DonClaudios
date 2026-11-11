import {Router} from 'express';
import {orderController} from '../controllers/order.controller';
import {orderMessageController} from '../controllers/orderMessage.controller';
import {paymentController} from '../controllers/payment.controller';
import {
  requireAuth,
  requireCustomer,
  requireCashier,
  optionalAuth
} from '../middleware/auth';
import {ApiError} from '../utils/error';
import {validate, validateQuery} from '../middleware/validation';
import {guestOtpLimiter, guestMessageLimiter} from '../middleware/rateLimit';
import {
  guestOtpSendDto,
  guestOtpVerifyDto,
  guestEmailOtpSendDto,
  guestEmailOtpVerifyDto,
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

router.get(
  '/guest/otp/email/status',
  guestOtpLimiter,
  orderController.checkGuestEmailOtpStatus
);
router.post(
  '/guest/otp/email',
  guestOtpLimiter,
  validate(guestEmailOtpSendDto),
  orderController.sendGuestEmailOtp
);
router.post(
  '/guest/otp/email/verify',
  guestOtpLimiter,
  validate(guestEmailOtpVerifyDto),
  orderController.verifyGuestEmailOtp
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

// XENDIT PAYMENT flow (customer side). Opens once the cashier confirms the
// order. Guests identify themselves with the order's phone number (query or
// body), customers with their JWT. Staff read the summary too.
router.get('/:id/payment', optionalAuth, paymentController.getSummary);
router.post(
  '/:id/payment/checkout',
  optionalAuth,
  paymentController.checkout
);
router.post('/:id/payment/cash', optionalAuth, paymentController.chooseCash);
router.post(
  '/:id/payment/balance',
  optionalAuth,
  paymentController.payBalance
);
// Staff: cash collected (cash on pickup, or the cash balance of a down payment).
router.patch(
  '/:id/payment/mark-paid',
  requireAuth,
  requireStaff,
  orderController.markOnlineOrderPaid
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

router.get(
  '/follow-up',
  requireAuth,
  requireStaff,
  orderMessageController.listFollowUpOrders
);

router.get('/:id', requireAuth, requireStaff, orderController.getOrderById);
router.patch(
  '/:id/status',
  requireAuth,
  requireStaff,
  orderController.updateStatus
);

router.get(
  '/:id/messages',
  requireAuth,
  requireCustomer,
  orderMessageController.listForCustomer
);
// Guest follow-up on their order page (no account; guest orders only).
router.get('/:id/messages/guest', orderMessageController.listForGuest);
router.post(
  '/:id/messages/guest',
  guestMessageLimiter,
  orderMessageController.sendByGuest
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
