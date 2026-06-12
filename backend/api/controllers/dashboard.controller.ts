import {Request, Response, NextFunction} from 'express';
import {OrderModel} from '../models/Order.model';
import {ProductModel} from '../models/Product.model';
import {CustomerModel} from '../models/Customer.model';
import {OrderItemModel} from '../models/OrderItem.model';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function startOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return startOfDay(d);
}

export const dashboardController = {
  async summary(_req: Request, res: Response, next: NextFunction) {
    try {
      const todayStart = startOfDay(new Date());
      const yesterdayStart = daysAgo(1);
      const todayEnd = new Date(todayStart.getTime() + 86400000);
      const yesterdayEnd = todayStart;
      const sevenDaysAgo = daysAgo(6);
      const weekStart = startOfWeek();

      const [todaySalesResult] = await OrderModel.aggregate([
        {$match: {createdAt: {$gte: todayStart, $lt: todayEnd}, orderStatus: {$ne: 'cancelled'}}},
        {$group: {_id: null, total: {$sum: '$totalAmount'}}}
      ]);

      const [yesterdaySalesResult] = await OrderModel.aggregate([
        {$match: {createdAt: {$gte: yesterdayStart, $lt: yesterdayEnd}, orderStatus: {$ne: 'cancelled'}}},
        {$group: {_id: null, total: {$sum: '$totalAmount'}}}
      ]);

      const [weeklyRevenueResult] = await OrderModel.aggregate([
        {$match: {createdAt: {$gte: sevenDaysAgo}, orderStatus: {$ne: 'cancelled'}}},
        {$group: {_id: null, total: {$sum: '$totalAmount'}}}
      ]);

      const todaySales = todaySalesResult?.total ?? 0;
      const yesterdaySales = yesterdaySalesResult?.total ?? 0;
      const totalRevenue = weeklyRevenueResult?.total ?? 0;

      const delta = yesterdaySales > 0 ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100 * 10) / 10 : 0;

      const productsInStock = await ProductModel.countDocuments({stock: {$gt: 0}, isAvailable: true});

      const totalCustomers = await CustomerModel.countDocuments();
      const newThisWeek = await CustomerModel.countDocuments({createdAt: {$gte: weekStart}});

      const daysParam = parseInt(_req.query.days as string) || 7;

      res.status(200).json({
        cards: [
          {
            key: 'todaySales',
            label: "Today's Sales",
            value: todaySales,
            delta,
            deltaLabel: 'vs yesterday'
          },
          {
            key: 'totalRevenue',
            label: 'Total Revenue',
            value: totalRevenue,
            context: `Last ${daysParam} days`
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
        ]
      });
    } catch (error) {
      next(error);
    }
  },

  async salesTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const startDate = daysAgo(days - 1);

      const results = await OrderModel.aggregate([
        {$match: {createdAt: {$gte: startDate}, orderStatus: {$ne: 'cancelled'}}},
        {
          $group: {
            _id: {$dateToString: {format: '%Y-%m-%d', date: '$createdAt'}},
            revenue: {$sum: '$totalAmount'}
          }
        },
        {$sort: {_id: 1}}
      ]);

      const dateMap = new Map<string, number>();
      for (let i = 0; i < days; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        dateMap.set(key, 0);
      }
      for (const r of results) {
        if (dateMap.has(r._id)) {
          dateMap.set(r._id, r.revenue);
        }
      }

      const daysArray = Array.from(dateMap.entries()).map(([date, revenue]) => ({
        date,
        revenue
      }));

      res.status(200).json({days: daysArray});
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

      const categories = results.map(r => ({
        category: r._id,
        count: r.count
      }));

      const dominant = categories.length > 0 ? categories[0] : {category: '', count: 0};

      res.status(200).json({categories, dominant});
    } catch (error) {
      next(error);
    }
  },

  async topProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

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
          $match: {
            'order.orderStatus': {$in: ['completed', 'delivered', 'confirmed', 'ready', 'on_the_way']},
            'order.createdAt': {$gte: startOfMonth}
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

      res.status(200).json({products});
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
