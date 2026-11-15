import {Router, type Request, type Response, type NextFunction} from 'express';
import {preOrderEventController as c} from '../controllers/preOrderEvent.controller';
import {optionalAuth, requireAuth, requireAdmin, requireCustomer} from '../middleware/auth';
import {ApiError} from '../utils/error';

/**
 * Dated pre-orders.
 *  Owner:    /preorders/events[...]           (admin; cashiers may read the
 *            list and a date's orders, and change order status via /orders)
 *  Public:   /preorders/open, /preorders/open/:id
 *  Customer: POST /preorders/open/:id/orders  (customer accounts only)
 */
const router = Router();

function requireStaff(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.type === 'admin' || req.auth?.type === 'cashier') return next();
  return next(new ApiError(403, 'FORBIDDEN', 'Admin or cashier access required'));
}

router.get('/open', optionalAuth, c.listOpen);
router.get('/open/:id', optionalAuth, c.getOpen);
router.post('/open/:id/orders', requireAuth, requireCustomer, c.place);

router.get('/events', requireAuth, requireStaff, c.list);
router.post('/events', requireAuth, requireAdmin, c.create);
router.get('/events/:id', requireAuth, requireAdmin, c.get);
router.put('/events/:id', requireAuth, requireAdmin, c.update);
router.patch('/events/:id/status', requireAuth, requireAdmin, c.setStatus);
router.post('/events/:id/duplicate', requireAuth, requireAdmin, c.duplicate);
router.delete('/events/:id', requireAuth, requireAdmin, c.remove);
router.get('/events/:id/orders', requireAuth, requireStaff, c.orders);

export default router;
