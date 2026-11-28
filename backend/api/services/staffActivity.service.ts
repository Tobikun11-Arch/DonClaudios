import type {Request} from 'express';
import {StaffActivityModel, type StaffActivityAction} from '../models/StaffActivity.model';
import type {OrderActor} from '../models/Order.model';
import {cashierRepository} from '../repositories/cashier.repository';
import {getClientIp} from '../utils/clientIp';
import type {ResolvedRange} from '../utils/dateRange';

function clientOf(req?: Request): 'web' | 'mobile' {
  const header = req?.headers?.['x-client'];
  const value = Array.isArray(header) ? header[0] : header;
  return value === 'mobile' ? 'mobile' : 'web';
}

/**
 * Staff activity log: cashier sign-ins / sign-outs and every order status a
 * staff member changed. Owners see it on the dashboard home ("Staff
 * activity") and in Reports > Staff. Recording never throws.
 */
export const staffActivityService = {
  async record(params: {
    actor: OrderActor;
    action: StaffActivityAction;
    orderId?: string | null;
    meta?: Record<string, unknown> | null;
    req?: Request;
    at?: Date;
  }) {
    const {actor} = params;
    if (!actor.id || (actor.type !== 'cashier' && actor.type !== 'admin')) return;
    try {
      await StaffActivityModel.create({
        actorId: actor.id,
        actorType: actor.type,
        actorName: actor.name ?? null,
        action: params.action,
        orderId: params.orderId ?? null,
        meta: params.meta ?? null,
        ip: params.req ? getClientIp(params.req) : null,
        client: clientOf(params.req),
        at: params.at ?? new Date()
      });
    } catch (error) {
      console.error('Failed to record staff activity', error);
    }
  },

  /**
   * Cashier signed in or out: log it and update presence. Owners see this in
   * Reports > Staff and the dashboard Staff activity card, not as
   * notifications (sign-ins/outs would flood the bell).
   */
  async recordSession(actor: OrderActor, action: 'login' | 'logout', req?: Request) {
    if (actor.type !== 'cashier') return;
    const at = new Date();
    // Online/Offline: sign-in counts as a heartbeat, sign-out ends it now.
    if (actor.id) {
      await cashierRepository
        .setLastSeen(actor.id, action === 'login' ? at : null)
        .catch(error => console.error('Failed to update cashier presence', error));
    }
    await this.record({actor, action, req, at});
  },

  async listRecent(limit = 20) {
    return StaffActivityModel.find({}).sort({at: -1}).limit(limit).lean().exec();
  },

  async list(params: {
    range: ResolvedRange;
    actorId?: string;
    action?: StaffActivityAction;
    page: number;
    limit: number;
  }) {
    const filter: Record<string, unknown> = {at: {$gte: params.range.from, $lte: params.range.to}};
    if (params.actorId) filter.actorId = params.actorId;
    if (params.action) filter.action = params.action;
    const [rows, total] = await Promise.all([
      StaffActivityModel.find(filter)
        .sort({at: -1})
        .skip((params.page - 1) * params.limit)
        .limit(params.limit)
        .lean()
        .exec(),
      StaffActivityModel.countDocuments(filter).exec()
    ]);
    return {rows, total};
  },

  /**
   * Who is on shift now (last session event today is a sign-in) and orders
   * handled per staff member since `since`.
   */
  async overview(since: Date) {
    const [sessions, handled, recent] = await Promise.all([
      StaffActivityModel.aggregate([
        {$match: {action: {$in: ['login', 'logout']}, at: {$gte: since}}},
        {$sort: {at: -1}},
        {
          $group: {
            _id: '$actorId',
            lastAction: {$first: '$action'},
            lastAt: {$first: '$at'},
            name: {$first: '$actorName'},
            firstLoginAt: {$last: '$at'}
          }
        }
      ]).exec(),
      StaffActivityModel.aggregate([
        {$match: {action: 'order_status', at: {$gte: since}}},
        {
          $group: {
            _id: '$actorId',
            name: {$last: '$actorName'},
            actorType: {$last: '$actorType'},
            orders: {$addToSet: '$orderId'},
            cancelled: {$sum: {$cond: [{$eq: ['$meta.status', 'cancelled']}, 1, 0]}}
          }
        },
        {
          $project: {
            name: 1,
            actorType: 1,
            cancelled: 1,
            ordersHandled: {$size: '$orders'}
          }
        },
        {$sort: {ordersHandled: -1}}
      ]).exec(),
      this.listRecent(15)
    ]);

    return {
      onShift: sessions
        .filter(s => s.lastAction === 'login')
        .map(s => ({actorId: s._id, name: s.name, since: s.lastAt})),
      handled: handled.map(h => ({
        actorId: h._id,
        name: h.name,
        actorType: h.actorType,
        ordersHandled: h.ordersHandled,
        cancelled: h.cancelled
      })),
      recent
    };
  }
};
