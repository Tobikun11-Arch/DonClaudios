import {Router} from 'express';
import {preOrderEventController as c} from '../controllers/preOrderEvent.controller';
import {optionalAuth, requireAuth, requireAdmin, requireCustomer} from '../middleware/auth';

/**
 * Dated pre-orders.
 *  Owner:    /preorders/events[...]           (admin only)
 *  Public:   /preorders/open, /preorders/open/:id
 *  Customer: POST /preorders/open/:id/orders  (customer accounts only)
 */
const router = Router();

router.get('/open', optionalAuth, c.listOpen);
router.get('/open/:id', optionalAuth, c.getOpen);
router.post('/open/:id/orders', requireAuth, requireCustomer, c.place);

router.get('/events', requireAuth, requireAdmin, c.list);
router.post('/events', requireAuth, requireAdmin, c.create);
router.get('/events/:id', requireAuth, requireAdmin, c.get);
router.put('/events/:id', requireAuth, requireAdmin, c.update);
router.patch('/events/:id/status', requireAuth, requireAdmin, c.setStatus);
router.post('/events/:id/duplicate', requireAuth, requireAdmin, c.duplicate);
router.delete('/events/:id', requireAuth, requireAdmin, c.remove);
router.get('/events/:id/orders', requireAuth, requireAdmin, c.orders);

export default router;
