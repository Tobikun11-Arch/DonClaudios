import {Router} from 'express';
import {authController} from '../controllers/auth.controller';
import {validate} from '../middleware/validation';
import {
  registerDto,
  resendVerificationDto,
  verifyDto,
  loginDto,
  refreshDto
} from '../dtos/auth.dto';
import {
  authLimiter,
  loginLimiter,
  sessionLimiter
} from '../middleware/rateLimit';
import {requireAuth} from '../middleware/auth';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validate(registerDto),
  authController.register
);
router.post('/verify', authLimiter, validate(verifyDto), authController.verify);
router.post(
  '/resend-verification',
  authLimiter,
  validate(resendVerificationDto),
  authController.resendVerification
);

router.post('/login', loginLimiter, validate(loginDto), authController.login);

router.post(
  '/refresh',
  sessionLimiter,
  validate(refreshDto),
  authController.refresh
);
router.post('/logout', sessionLimiter, authController.logout);
router.get('/me', sessionLimiter, requireAuth, authController.me);
export default router;
