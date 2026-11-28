import type {Request, Response, NextFunction} from 'express';
import {preOrderEventService} from '../services/preOrderEvent.service';
import {ApiError} from '../utils/error';
import {customerOrderGuardService} from '../services/customerOrderGuard.service';

const wrap =
  (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

export const preOrderEventController = {
  // ----- owner -----
  list: wrap(async (req, res) => {
    const events = await preOrderEventService.listForOwner();
    // Cashiers only work published/closed dates; drafts are the owner's.
    res.json({
      events: req.auth?.type === 'cashier' ? events.filter(e => e.status !== 'draft') : events
    });
  }),
  get: wrap(async (req, res) => {
    res.json({event: await preOrderEventService.getForOwner(req.params.id)});
  }),
  create: wrap(async (req, res) => {
    const event = await preOrderEventService.create(req.auth!.userId, req.body ?? {});
    res.status(201).json({event});
  }),
  update: wrap(async (req, res) => {
    res.json({event: await preOrderEventService.update(req.params.id, req.body ?? {})});
  }),
  setStatus: wrap(async (req, res) => {
    res.json({event: await preOrderEventService.setStatus(req.params.id, req.body?.status)});
  }),
  duplicate: wrap(async (req, res) => {
    const event = await preOrderEventService.duplicate(req.params.id, req.body ?? {});
    res.status(201).json({event});
  }),
  remove: wrap(async (req, res) => {
    await preOrderEventService.remove(req.params.id);
    res.status(204).end();
  }),
  orders: wrap(async (req, res) => {
    res.json({orders: await preOrderEventService.ordersForOwner(req.params.id)});
  }),

  // ----- customers / public -----
  // Signed-in customers also get `mine`: their active orders and pieces held.
  listOpen: wrap(async (req, res) => {
    const customerId = req.auth?.type === 'customer' ? req.auth.userId : undefined;
    res.json({events: await preOrderEventService.listOpen(customerId)});
  }),
  getOpen: wrap(async (req, res) => {
    const customerId = req.auth?.type === 'customer' ? req.auth.userId : undefined;
    res.json({event: await preOrderEventService.getOpen(req.params.id, customerId)});
  }),
  place: wrap(async (req, res) => {
    if (req.auth?.type !== 'customer') {
      throw new ApiError(403, 'PRE_ORDER_REQUIRES_ACCOUNT', 'Sign in to your customer account to pre-order');
    }
    // An account under a temporary spam block cannot pre-order either.
    await customerOrderGuardService.assertNotBlocked(
      customerOrderGuardService.buildContext(req, req.auth.userId, [])
    );
    const order = await preOrderEventService.placeOrder(req.auth.userId, req.params.id, req.body ?? {});
    res.status(201).json({order});
  })
};
