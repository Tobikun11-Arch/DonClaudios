import {Request, Response, NextFunction} from 'express';
import {OrderModel} from '../models/Order.model';
import {ProductModel} from '../models/Product.model';
import {CustomerModel} from '../models/Customer.model';
import {OrderItemModel} from '../models/OrderItem.model';
import {
  buildBuckets,
  bucketExpression,
  countManilaDays,
  manilaDayStartUtc,
  normalizePreset,
  percentDelta,
  resolveRange
} from '../utils/dateRange';

/**
 * Every state an order can be in that still represents money taken. `cancelled`
 * is the only exclusion. Previously this list also contained `delivered`, which
 * is not a valid OrderStatus and could therefore never match anything.
 */
/**
 * Every non-cancelled state. This is value *placed*, not money collected:
 * nothing in the order flow closes an abandoned order, so old rows linger here
 * indefinitely. Use REALIZED_STATUSES for anything presented as revenue.
 */
export const REVENUE_STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'completed'
] as const;

/** The only state where money has actually been collected. */
export const REALIZED_STATUSES = ['completed'] as const;

/** Open orders past this age are abandoned, not pending. */
const STALE_OPEN_DAYS = 7;

const REVENUE_MATCH = REVENUE_STATUSES as unknown as string[];
const REALIZED_MATCH = REALIZED_STATUSES as unknown as string[];
const OPEN_MATCH = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'] as unknown as string[];

function manilaWeekStart(): Date {
  const start = manilaDayStartUtc(new Date());
  const shifted = new Date(start.getTime() + 8 * 60 * 60 * 1000);
  return new Date(start.getTime() - shifted.getUTCDay() * 24 * 60 * 60 * 1000);
}

export const dashboardController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const range = resolveRange({preset: normalizePreset(req.query.days)});
      const days = countManilaDays(range.from, range.to);

      const todayStart = manilaDayStartUtc(new Date());
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const weekStart = manilaWeekStart();

      const revenueBetween = (from: Date, to: Date, statuses: string[]) =>
        OrderModel.aggregate([
          {$match: {createdAt: {$gte: from, $lt: to}, orderStatus: {$in: statuses}}},
          {$group: {_id: null, total: {$sum: '$totalAmount'}, count: {$sum: 1}}}
        ]).then(rows => ({total: rows[0]?.total ?? 0, count: rows[0]?.count ?? 0}));

      // Cards report collected revenue. The placed-but-unfulfilled remainder is
      // carried in `openValue`/`stuckOrders` so the two always reconcile.
      const [today, yesterday, rangeCollected, prevCollected, rangeOpen, rangePlaced] =
        await Promise.all([
          revenueBetween(todayStart, range.to, REALIZED_MATCH),
          revenueBetween(yesterdayStart, todayStart, REALIZED_MATCH),
          revenueBetween(range.from, range.to, REALIZED_MATCH),
          revenueBetween(range.prevFrom, range.prevTo, REALIZED_MATCH),
          revenueBetween(range.from, range.to, OPEN_MATCH),
          revenueBetween(range.from, range.to, REVENUE_MATCH)
        ]);

      // Stuck orders are all-time on purpose: a queue that only grows is the
      // problem, and scoping it to the selected range would hide it.
      const staleCutoff = new Date(Date.now() - STALE_OPEN_DAYS * 86400000);
      const stuck = await OrderModel.aggregate([
        {$match: {orderStatus: {$in: OPEN_MATCH}, createdAt: {$lt: staleCutoff}}},
        {$group: {_id: null, count: {$sum: 1}, total: {$sum: '$totalAmount'}, oldest: {$min: '$createdAt'}}}
      ]).then(rows => ({
        count: rows[0]?.count ?? 0,
        total: rows[0]?.total ?? 0,
        oldestDays: rows[0]?.oldest
          ? Math.floor((Date.now() - new Date(rows[0].oldest).getTime()) / 86400000)
          : null
      }));

      const [productsInStock, totalCustomers, newThisWeek] = await Promise.all([
        ProductModel.countDocuments({stock: {$gt: 0}, isAvailable: true}),
        CustomerModel.countDocuments(),
        CustomerModel.countDocuments({createdAt: {$gte: weekStart}})
      ]);

      res.status(200).json({
        range: {preset: range.preset, label: range.label, days, granularity: range.granularity},
        cards: [
          {
            key: 'todaySales',
            label: "Today's Sales",
            value: today.total,
            delta: percentDelta(today.total, yesterday.total) ?? 0,
            deltaLabel: 'vs yesterday',
            context: today.count > 0 ? `${today.count} completed` : 'No completed orders yet'
          },
          {
            key: 'totalRevenue',
            label: 'Revenue Collected',
            value: rangeCollected.total,
            delta: percentDelta(rangeCollected.total, prevCollected.total) ?? 0,
            deltaLabel: `vs previous ${days}d`,
            context:
              rangeOpen.total > 0
                ? `+${rangeOpen.total.toLocaleString()} still open`
                : 'Nothing left open'
          },
          {
            key: 'productsInStock',
            label: 'Products',
            value: productsInStock,
            context: 'In Stock'
          },
          {
            key: 'customers',
            label: 'Customers',
            value: totalCustomers,
            context: `+${newThisWeek} this week`
          }
        ],
        // Lets the dashboard show the split without a second round trip.
        valueSplit: {
          collected: rangeCollected.total,
          collectedOrders: rangeCollected.count,
          open: rangeOpen.total,
          openOrders: rangeOpen.count,
          placed: rangePlaced.total,
          stuckOrders: stuck.count,
          stuckValue: stuck.total,
          oldestStuckDays: stuck.oldestDays,
          staleAfterDays: STALE_OPEN_DAYS
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async salesTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const range = resolveRange({preset: normalizePreset(req.query.days)});
      const granularity = range.granularity;

      const results = await OrderModel.aggregate([
        {$match: {createdAt: {$gte: range.from, $lt: range.to}, orderStatus: {$in: REVENUE_MATCH}}},
        {
          $group: {
            _id: bucketExpression('createdAt', granularity),
            revenue: {
              $sum: {$cond: [{$in: ['$orderStatus', REALIZED_MATCH]}, '$totalAmount', 0]}
            },
            orders: {$sum: {$cond: [{$in: ['$orderStatus', REALIZED_MATCH]}, 1, 0]}},
            openRevenue: {
              $sum: {$cond: [{$in: ['$orderStatus', OPEN_MATCH]}, '$totalAmount', 0]}
            }
          }
        },
        {$sort: {_id: 1}}
      ]);

      const byBucket = new Map<string, {revenue: number; orders: number; openRevenue: number}>();
      for (const row of results) {
        byBucket.set(row._id as string, {
          revenue: row.revenue as number,
          orders: row.orders as number,
          openRevenue: row.openRevenue as number
        });
      }

      const days = buildBuckets(range.from, range.to, granularity).map(date => ({
        date,
        revenue: byBucket.get(date)?.revenue ?? 0,
        orders: byBucket.get(date)?.orders ?? 0,
        openRevenue: byBucket.get(date)?.openRevenue ?? 0
      }));

      res.status(200).json({days, granularity});
    } catch (error) {
      next(error);
    }
  },

  async inventoryByCategory(_req: Request, res: Response, next: NextFunction) {
    try {
      const results = await ProductModel.aggregate([
        {$match: {isAvailable: true}},
        {$group: {_id: '$category', count: {$sum: '$stock'}}},
        {$sort: {count: -1}}
      ]);

      const categories = results.map(r => ({category: r._id, count: r.count}));
      const dominant = categories.length > 0 ? categories[0] : {category: '', count: 0};

      res.status(200).json({categories, dominant});
    } catch (error) {
      next(error);
    }
  },

  async topProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      // Default to the current calendar month. `normalizePreset` falls back to
      // '7d' for an empty value, so the default has to be applied before it.
      const range = resolveRange({
        preset: normalizePreset(req.query.range ?? 'thisMonth')
      });

      const results = await OrderItemModel.aggregate([
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {$unwind: '$order'},
        {
          // Completed orders only, so "top products" reflects what was actually
          // sold rather than what was requested and then abandoned.
          $match: {
            'order.orderStatus': {$in: REALIZED_MATCH},
            'order.createdAt': {$gte: range.from, $lt: range.to}
          }
        },
        {$group: {_id: '$productId', unitsSold: {$sum: '$quantity'}, revenue: {$sum: {$multiply: ['$quantity', '$price']}}}},
        {$sort: {unitsSold: -1}},
        {$limit: limit},
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {$unwind: '$product'},
        {$project: {name: '$product.name', unitsSold: 1, revenue: 1}}
      ]);

      const products = results.map((r, idx) => ({
        rank: idx + 1,
        productId: r._id.toString(),
        name: r.name,
        unitsSold: r.unitsSold,
        revenue: r.revenue
      }));

      res.status(200).json({products, range: {preset: range.preset, label: range.label}});
    } catch (error) {
      next(error);
    }
  },

  async lowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;

      const items = await ProductModel.find({
        stock: {$gt: 0, $lte: threshold},
        isAvailable: true
      })
        .select('name stock')
        .sort({stock: 1})
        .lean();

      const mapped = items.map(i => ({
        productId: i._id.toString(),
        name: i.name,
        stock: i.stock
      }));

      res.status(200).json({count: mapped.length, items: mapped});
    } catch (error) {
      next(error);
    }
  }
};
