"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = void 0;
const Order_model_1 = require("../models/Order.model");
const Product_model_1 = require("../models/Product.model");
const Customer_model_1 = require("../models/Customer.model");
const OrderItem_model_1 = require("../models/OrderItem.model");
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return startOfDay(d);
}
function startOfWeek() {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return startOfDay(d);
}
exports.dashboardController = {
    async summary(_req, res, next) {
        try {
            const todayStart = startOfDay(new Date());
            const yesterdayStart = daysAgo(1);
            const todayEnd = new Date(todayStart.getTime() + 86400000);
            const yesterdayEnd = todayStart;
            const sevenDaysAgo = daysAgo(6);
            const weekStart = startOfWeek();
            const [todaySalesResult] = await Order_model_1.OrderModel.aggregate([
                { $match: { createdAt: { $gte: todayStart, $lt: todayEnd }, orderStatus: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);
            const [yesterdaySalesResult] = await Order_model_1.OrderModel.aggregate([
                { $match: { createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd }, orderStatus: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);
            const [weeklyRevenueResult] = await Order_model_1.OrderModel.aggregate([
                { $match: { createdAt: { $gte: sevenDaysAgo }, orderStatus: { $ne: 'cancelled' } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]);
            const todaySales = todaySalesResult?.total ?? 0;
            const yesterdaySales = yesterdaySalesResult?.total ?? 0;
            const totalRevenue = weeklyRevenueResult?.total ?? 0;
            const delta = yesterdaySales > 0 ? Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100 * 10) / 10 : 0;
            const productsInStock = await Product_model_1.ProductModel.countDocuments({ stock: { $gt: 0 }, isAvailable: true });
            const totalCustomers = await Customer_model_1.CustomerModel.countDocuments();
            const newThisWeek = await Customer_model_1.CustomerModel.countDocuments({ createdAt: { $gte: weekStart } });
            const daysParam = parseInt(_req.query.days) || 7;
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
        }
        catch (error) {
            next(error);
        }
    },
    async salesTrend(req, res, next) {
        try {
            const days = parseInt(req.query.days) || 7;
            const startDate = daysAgo(days - 1);
            const results = await Order_model_1.OrderModel.aggregate([
                { $match: { createdAt: { $gte: startDate }, orderStatus: { $ne: 'cancelled' } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        revenue: { $sum: '$totalAmount' }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            const dateMap = new Map();
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
            res.status(200).json({ days: daysArray });
        }
        catch (error) {
            next(error);
        }
    },
    async inventoryByCategory(_req, res, next) {
        try {
            const results = await Product_model_1.ProductModel.aggregate([
                { $match: { isAvailable: true } },
                { $group: { _id: '$category', count: { $sum: '$stock' } } },
                { $sort: { count: -1 } }
            ]);
            const categories = results.map(r => ({
                category: r._id,
                count: r.count
            }));
            const dominant = categories.length > 0 ? categories[0] : { category: '', count: 0 };
            res.status(200).json({ categories, dominant });
        }
        catch (error) {
            next(error);
        }
    },
    async topProducts(req, res, next) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const results = await OrderItem_model_1.OrderItemModel.aggregate([
                {
                    $lookup: {
                        from: 'orders',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'order'
                    }
                },
                { $unwind: '$order' },
                {
                    $match: {
                        'order.orderStatus': { $in: ['completed', 'delivered', 'confirmed', 'ready', 'on_the_way'] },
                        'order.createdAt': { $gte: startOfMonth }
                    }
                },
                { $group: { _id: '$productId', unitsSold: { $sum: '$quantity' }, revenue: { $sum: { $multiply: ['$quantity', '$price'] } } } },
                { $sort: { unitsSold: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                { $unwind: '$product' },
                { $project: { name: '$product.name', unitsSold: 1, revenue: 1 } }
            ]);
            const products = results.map((r, idx) => ({
                rank: idx + 1,
                productId: r._id.toString(),
                name: r.name,
                unitsSold: r.unitsSold,
                revenue: r.revenue
            }));
            res.status(200).json({ products });
        }
        catch (error) {
            next(error);
        }
    },
    async lowStock(req, res, next) {
        try {
            const threshold = parseInt(req.query.threshold) || 10;
            const items = await Product_model_1.ProductModel.find({
                stock: { $gt: 0, $lte: threshold },
                isAvailable: true
            })
                .select('name stock')
                .sort({ stock: 1 })
                .lean();
            const mapped = items.map(i => ({
                productId: i._id.toString(),
                name: i.name,
                stock: i.stock
            }));
            res.status(200).json({ count: mapped.length, items: mapped });
        }
        catch (error) {
            next(error);
        }
    }
};
