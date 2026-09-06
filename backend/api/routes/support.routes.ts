import {Router} from 'express';
import {supportController} from '../controllers/support.controller';
import {requireAuth, requireAdmin, optionalAuth} from '../middleware/auth';

const router = Router();

router.get('/my', optionalAuth, supportController.getMy);
router.post('/conversations', optionalAuth, supportController.getOrCreateConversation);
router.get(
  '/conversations/:id/messages',
  optionalAuth,
  supportController.listMessages
);
router.post(
  '/conversations/:id/messages',
  optionalAuth,
  supportController.sendMessage
);
router.patch(
  '/conversations/:id/close',
  optionalAuth,
  supportController.closeMyConversation
);

router.get(
  '/admin/conversations',
  requireAuth,
  requireAdmin,
  supportController.listAll
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
  '/admin/conversations/:id/close',
  requireAuth,
  requireAdmin,
  supportController.closeConversation
);

export default router;