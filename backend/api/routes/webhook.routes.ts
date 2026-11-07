import {Router} from 'express';
import {paymentController} from '../controllers/payment.controller';

/**
 * Server-to-server callbacks. No user auth: every handler verifies Xendit's
 * `x-callback-token` header against XENDIT_WEBHOOK_TOKEN instead.
 *
 * Set these in the Xendit dashboard (Settings -> Webhooks):
 *   Invoices paid/expired -> https://<backend>/api/webhooks/xendit/invoice
 *   Refund succeeded/failed -> https://<backend>/api/webhooks/xendit/refund
 */
const router = Router();

router.post('/xendit/invoice', paymentController.invoiceWebhook);
router.post('/xendit/refund', paymentController.refundWebhook);

export default router;
