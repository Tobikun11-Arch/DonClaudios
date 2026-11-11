import {OrderItemModel} from '../models/OrderItem.model';

/** Days of completed orders counted toward "best sellers" on the menu. */
const WINDOW_DAYS = 30;
/** The menu asks for a handful; never let a caller pull a long ranked list. */
const MAX_LIMIT = 12;
/** Ranking changes slowly, so one aggregation serves every visitor for a while. */
const CACHE_MS = 5 * 60 * 1000;

let cache: {at: number; ids: string[]} | null = null;

/**
 * Product ids ranked by units sold in completed orders over the last 30 days.
 *
 * Public on purpose, so it returns ids only: no unit counts or revenue. The
 * menu already has every product's name, photo and price. Same "completed
 * only" rule as the admin dashboard's top products, so an abandoned or
 * cancelled order never makes an item look popular.
 */
export const bestSellerService = {
  async productIds(limit: number): Promise<string[]> {
    const safeLimit = Math.min(Math.max(Math.trunc(limit) || 6, 1), MAX_LIMIT);

    if (!cache || Date.now() - cache.at > CACHE_MS) {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const rows = await OrderItemModel.aggregate<{_id: unknown}>([
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {$unwind: '$order'},
        {$match: {'order.orderStatus': 'completed', 'order.createdAt': {$gte: since}}},
        {$group: {_id: '$productId', unitsSold: {$sum: '$quantity'}}},
        {$sort: {unitsSold: -1}},
        {$limit: MAX_LIMIT}
      ]);
      cache = {at: Date.now(), ids: rows.map(r => String(r._id))};
    }

    return cache.ids.slice(0, safeLimit);
  }
};
