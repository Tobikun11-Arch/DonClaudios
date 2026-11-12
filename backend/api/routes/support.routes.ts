import {Router} from 'express';
import {supportController} from '../controllers/support.controller';
import {
  requireAuth,
  requireAdmin,
  requireCashier,
  optionalAuth
} from '../middleware/auth';
import {
  supportMessageLimiter,
  supportStartLimiter
} from '../middleware/rateLimit';

const router = Router();

router.get('/my', optionalAuth, supportController.getMy);
router.post(
  '/conversations',
  supportStartLimiter,
  optionalAuth,
  supportController.getOrCreateConversation
);
router.get(
  '/conversations/:id/messages',
  optionalAuth,
  supportController.listMessages
);
router.post(
  '/conversations/:id/messages',
  supportMessageLimiter,
  optionalAuth,
  supportController.sendMessage
);
router.patch(
  '/conversations/:id/close',
  optionalAuth,
  supportController.closeMyConversation
);

// ---- Cashier: urgent inquiries only (last 24h) ----------------------------
router.get(
  '/cashier/urgent',
  requireAuth,
  requireCashier,
  supportController.listUrgentForCashier
);
router.get(
  '/cashier/conversations/:id/messages',
  requireAuth,
  requireCashier,
  supportController.listMessagesCashier
);
router.post(
  '/cashier/conversations/:id/messages',
  requireAuth,
  requireCashier,
  supportController.sendMessageCashier
);

// ---- Owner: inquiry queue -------------------------------------------------
router.get(
  '/admin/conversations',
  requireAuth,
  requireAdmin,
  supportController.listAll
);
router.get(
  '/admin/inquiries',
  requireAuth,
  requireAdmin,
  supportController.listInquiryLog
);
router.get(
  '/admin/queue-stats',
  requireAuth,
  requireAdmin,
  supportController.getQueueStats
);
router.get(
  '/admin/conversations/:id/messages',
  requireAuth,
  requireAdmin,
  supportController.listMessagesAdmin
);
router.post(
  '/admin/conversations/:id/messages',
  requireAuth,
  requireAdmin,
  supportController.sendMessageAdmin
);
router.patch(
  '/admin/conversations/:id/answered',
  requireAuth,
  requireAdmin,
  supportController.markAnswered
);
router.patch(
  '/admin/conversations/:id/close',
  requireAuth,
  requireAdmin,
  supportController.closeConversation
);

export default router;
