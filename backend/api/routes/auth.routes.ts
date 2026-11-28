import {Router} from 'express';
import {authController} from '../controllers/auth.controller';
import {validate} from '../middleware/validation';
import {
  registerDto,
  resendVerificationDto,
  verifyDto,
  verifyEmailDto,
  resendVerificationEmailDto,
  loginDto,
  refreshDto,
  updateProfileDto,
  changePasswordDto,
  deleteAccountDto,
  forgotPasswordDto,
  verifyResetCodeDto,
  resetPasswordDto,
  googleSignInDto,
  setPasswordDto,
  phoneSendCodeDto,
  phoneVerifyDto,
  mfaCodeDto,
  mfaChallengeDto,
  mfaVerifyDto,
  orderEmailPrefDto
} from '../dtos/auth.dto';
import {
  authLimiter,
  loginLimiter,
  sessionLimiter
} from '../middleware/rateLimit';
import {requireAuth, requireAdmin, requireCashier, requireCustomer} from '../middleware/auth';
import {accountController} from '../controllers/account.controller';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerDto),
  authController.register
);
router.post('/verify', authLimiter, validate(verifyDto), authController.verify);
router.post(
  '/verify-email',
  authLimiter,
  validate(verifyEmailDto),
  authController.verifyEmail
);
router.post(
  '/resend-verification',
  authLimiter,
  validate(resendVerificationDto),
  authController.resendVerification
);
router.post(
  '/resend-verification-email',
  authLimiter,
  validate(resendVerificationEmailDto),
  authController.resendVerificationEmail
);

router.post('/login', loginLimiter, validate(loginDto), authController.login);

// "Continue with Google" (customers) and the second sign-in step (MFA).
router.post('/google', loginLimiter, validate(googleSignInDto), accountController.googleSignIn);
router.post('/mfa/verify', loginLimiter, validate(mfaVerifyDto), accountController.mfaVerify);
router.post('/mfa/resend', authLimiter, validate(mfaChallengeDto), accountController.mfaResend);

// Signed-in customer: connected accounts, password, phone, MFA, email prefs.
router.post('/google/link', sessionLimiter, requireAuth, requireCustomer, validate(googleSignInDto), accountController.linkGoogle);
router.post('/google/unlink', sessionLimiter, requireAuth, requireCustomer, accountController.unlinkGoogle);
router.post('/password/set', authLimiter, requireAuth, requireCustomer, validate(setPasswordDto), accountController.setPassword);
router.post('/phone/send-code', authLimiter, requireAuth, requireCustomer, validate(phoneSendCodeDto), accountController.sendPhoneCode);
router.post('/phone/verify', authLimiter, requireAuth, requireCustomer, validate(phoneVerifyDto), accountController.verifyPhone);
router.post('/mfa/send-code', authLimiter, requireAuth, requireCustomer, accountController.sendMfaCode);
router.post('/mfa/enable', authLimiter, requireAuth, requireCustomer, validate(mfaCodeDto), accountController.enableMfa);
router.post('/mfa/totp/setup', authLimiter, requireAuth, requireCustomer, accountController.startTotpSetup);
router.post('/mfa/totp/enable', authLimiter, requireAuth, requireCustomer, validate(mfaCodeDto), accountController.enableTotp);
router.post('/mfa/disable', authLimiter, requireAuth, requireCustomer, validate(mfaCodeDto), accountController.disableMfa);
router.put('/me/order-emails', sessionLimiter, requireAuth, requireCustomer, validate(orderEmailPrefDto), accountController.setOrderEmails);

router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordDto),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordDto),
  authController.resetPassword
);

router.post(
  '/verify-reset-code',
  authLimiter,
  validate(verifyResetCodeDto),
  authController.verifyResetCode
);

router.post(
  '/refresh',
  sessionLimiter,
  validate(refreshDto),
  authController.refresh
);
router.post('/logout', sessionLimiter, authController.logout);
// Cashier apps call this every minute while open (Online/Offline status).
// No IP limiter: every till in the store shares one IP.
router.post('/heartbeat', requireAuth, requireCashier, authController.heartbeat);
router.get('/me', sessionLimiter, requireAuth, authController.me);
router.post(
  '/me/onboarding-tour',
  sessionLimiter,
  requireAuth,
  authController.completeOnboardingTour
);

router.put(
  '/profile',
  requireAuth,
  validate(updateProfileDto),
  authController.updateProfile
);

router.put(
  '/password',
  requireAuth,
  validate(changePasswordDto),
  authController.changePassword
);

router.get(
  '/sessions',
  requireAuth,
  requireAdmin,
  authController.sessions
);
router.delete(
  '/account',
  sessionLimiter,
  requireAuth,
  validate(deleteAccountDto),
  authController.deleteAccount
);

router.get('/me/data', sessionLimiter, requireAuth, authController.downloadData);

export default router;
