import mongoose from 'mongoose';
import {OrderModel} from '../models/Order.model';
import {ProductModel} from '../models/Product.model';
import {CustomerModel} from '../models/Customer.model';
import {StockMovementModel} from '../models/StockMovement.model';
import {getReportOperations} from './report.service';
import {
  defaultGranularity,
  toManilaDayKey,
  type ResolvedRange
} from '../utils/dateRange';

/*
 * Data for the exported PDF reports.
 *
 * Every report figure is computed here from ONE fetched set of orders, so a
 * summary line and the detail table under it can never disagree (the old PDF
 * printed two different "collected" totals from two different queries).
 *
 * Revenue basis (PFRS 15): a sale is recognised when the order is COMPLETED.
 * Walk-in orders must also be marked paid. Money received for orders that are
 * not completed yet is reported separately as customer deposits, never as
 * sales. Cancelled orders are excluded. Xendit transaction fees are paid by
 * the customer to the payment provider and are not sales.
 */

const OPEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'];

/** Mongo filter for a recognised sale (see the basis above). */
const SALE_MATCH = {
  orderStatus: 'completed',
  $or: [
    {orderSource: {$ne: 'in-store'}},
    {paymentStatus: 'paid'},
    {paymentStatus: {$exists: false}}
  ]
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  pickup: 'Pick-up',
  delivery: 'Delivery',
  reservation: 'Reservation'
};

const SOURCE_LABELS: Record<string, string> = {
  online: 'Online',
  'in-store': 'Walk-in (counter)'
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Credit/Debit card',
  gcash: 'GCash',
  maya: 'Maya',
  grabpay: 'GrabPay',
  shopeepay: 'ShopeePay',
  bdo: 'BDO transfer',
  bpi: 'BPI transfer',
  psbank: 'PSBank transfer'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending (awaiting confirmation)',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for pick-up',
  on_the_way: 'Out for delivery',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MANILA_OFFSET_MS = 8 * 3600000;

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = <T>(rows: T[], pick: (row: T) => number) =>
  round2(rows.reduce((acc, row) => acc + (pick(row) || 0), 0));
const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

export function orderRef(order: {_id: unknown; orderNumber?: string | null}) {
  return order.orderNumber || `#${String(order._id).slice(-6).toUpperCase()}`;
}

function manilaParts(date: Date) {
  const d = new Date(date.getTime() + MANILA_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours()
  };
}

export function formatManilaDate(date: Date) {
  const p = manilaParts(date);
  return `${MONTHS[p.month]} ${p.day}, ${p.year}`;
}

function shortDay(date: Date) {
  const p = manilaParts(date);
  return `${MONTHS[p.month]} ${p.day}`;
}

/** Bucket key + human label ("Aug 10 – Aug 16, 2026", "Sep 2026"). */
function periodBucket(date: Date, granularity: 'day' | 'week' | 'month') {
  const p = manilaParts(date);
  if (granularity === 'day') {
    return {key: toManilaDayKey(date), label: formatManilaDate(date)};
  }
  if (granularity === 'month') {
    return {
      key: `${p.year}-${String(p.month + 1).padStart(2, '0')}`,
      label: `${MONTHS[p.month]} ${p.year}`
    };
  }
  // Week starting Monday (Manila).
  const offset = (p.weekday + 6) % 7;
  const start = new Date(date.getTime() - offset * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  return {
    key: toManilaDayKey(start),
    label: `${shortDay(start)} – ${shortDay(end)}, ${manilaParts(end).year}`
  };
}

// ---------------------------------------------------------------------------
// Shared order fetch
// ---------------------------------------------------------------------------

type SaleRow = {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  totalAmount: number;
  deliveryFee: number;
  orderType: string;
  orderSource: string;
  paymentMethod: string | null;
  isGuest: boolean;
  customerId: mongoose.Types.ObjectId | null;
  transactionFee: number;
  gross: number;
  units: number;
  items: Array<{productId: mongoose.Types.ObjectId; quantity: number; price: number}>;
};

function rangeFilter(range: ResolvedRange) {
  return {createdAt: {$gte: range.from, $lt: range.to}};
}

/** All recognised sales in the period, with their line items. */
async function fetchSales(range: ResolvedRange): Promise<SaleRow[]> {
  return OrderModel.aggregate<SaleRow>([
    {$match: {...rangeFilter(range), ...SALE_MATCH}},
    {$lookup: {from: 'order_items', localField: '_id', foreignField: 'orderId', as: 'items'}},
    {
      $project: {
        createdAt: 1,
        totalAmount: {$ifNull: ['$totalAmount', 0]},
        deliveryFee: {$ifNull: ['$deliveryFee', 0]},
        orderType: 1,
        orderSource: {$ifNull: ['$orderSource', 'online']},
        paymentMethod: {$ifNull: ['$paymentMethod', null]},
        isGuest: {$ifNull: ['$isGuest', false]},
        customerId: {$ifNull: ['$customerId', null]},
        transactionFee: {$ifNull: ['$transactionFee', 0]},
        items: {
          $map: {
            input: '$items',
            as: 'i',
            in: {productId: '$$i.productId', quantity: '$$i.quantity', price: '$$i.price'}
          }
        },
        gross: {
          $reduce: {
            input: '$items',
            initialValue: 0,
            in: {$add: ['$$value', {$multiply: ['$$this.quantity', '$$this.price']}]}
          }
        },
        units: {$reduce: {input: '$items', initialValue: 0, in: {$add: ['$$value', '$$this.quantity']}}}
      }
    }
  ]);
}

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export type GroupRow = {label: string; orders: number; amount: number; share: number};

function groupSales(rows: SaleRow[], keyOf: (r: SaleRow) => string, labelOf: (k: string) => string, total: number): GroupRow[] {
  const map = new Map<string, {orders: number; amount: number}>();
  for (const r of rows) {
    const k = keyOf(r);
    const g = map.get(k) ?? {orders: 0, amount: 0};
    g.orders += 1;
    g.amount += r.totalAmount;
    map.set(k, g);
  }
  return [...map.entries()]
    .map(([k, g]) => ({label: labelOf(k), orders: g.orders, amount: round2(g.amount), share: share(g.amount, total)}))
    .sort((a, b) => b.amount - a.amount);
}

export async function getSalesData(range: ResolvedRange) {
  const [sales, deposits, cancelled, unpaidWalkIn, openOrders, feesAll] = await Promise.all([
    fetchSales(range),
    // Paid (fully or partly) but not completed yet -> customer deposits.
    OrderModel.aggregate([
      {$match: {...rangeFilter(range), orderStatus: {$in: OPEN_STATUSES}, amountPaid: {$gt: 0}}},
      {$group: {_id: null, orders: {$sum: 1}, amount: {$sum: '$amountPaid'}}}
    ]),
    OrderModel.aggregate([
      {$match: {...rangeFilter(range), orderStatus: 'cancelled'}},
      {$group: {_id: null, orders: {$sum: 1}, amount: {$sum: '$totalAmount'}}}
    ]),
    OrderModel.aggregate([
      {$match: {...rangeFilter(range), orderStatus: 'completed', orderSource: 'in-store', paymentStatus: {$exists: true, $ne: 'paid'}}},
      {$group: {_id: null, orders: {$sum: 1}, amount: {$sum: '$totalAmount'}}}
    ]),
    OrderModel.aggregate([
      {$match: {...rangeFilter(range), orderStatus: {$in: OPEN_STATUSES}}},
      {$group: {_id: null, orders: {$sum: 1}, amount: {$sum: '$totalAmount'}}}
    ]),
    OrderModel.aggregate([
      {$match: {...rangeFilter(range), orderStatus: {$ne: 'cancelled'}, transactionFee: {$gt: 0}}},
      {$group: {_id: null, amount: {$sum: '$transactionFee'}}}
    ])
  ]);

  const grossSales = sum(sales, r => r.gross);
  const deliveryFees = sum(sales, r => r.deliveryFee);
  const totalSales = sum(sales, r => r.totalAmount);
  // Per order: charged below menu price = discount (promos, vouchers);
  // charged above menu price = other charges (e.g. a price changed after the
  // order). Kept apart so neither hides the other.
  const discounts = sum(sales, r => Math.max(0, r.gross + r.deliveryFee - r.totalAmount));
  const otherCharges = sum(sales, r => Math.max(0, r.totalAmount - r.gross - r.deliveryFee));
  const netSales = round2(grossSales - discounts + otherCharges);
  const orders = sales.length;
  const units = sales.reduce((a, r) => a + r.units, 0);

  const granularity = defaultGranularity(range.days);
  const buckets = new Map<string, {label: string; orders: number; units: number; amount: number}>();
  for (const r of [...sales].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const b = periodBucket(new Date(r.createdAt), granularity);
    const g = buckets.get(b.key) ?? {label: b.label, orders: 0, units: 0, amount: 0};
    g.orders += 1;
    g.units += r.units;
    g.amount += r.totalAmount;
    buckets.set(b.key, g);
  }

  const one = (rows: Array<{orders: number; amount: number}>) => ({
    orders: rows[0]?.orders ?? 0,
    amount: round2(rows[0]?.amount ?? 0)
  });

  return {
    granularity,
    summary: {grossSales, discounts, otherCharges, netSales, deliveryFees, totalSales, orders, units, avgOrder: orders ? round2(totalSales / orders) : 0},
    byOrderType: groupSales(sales, r => r.orderType, k => ORDER_TYPE_LABELS[k] ?? k, totalSales),
    bySource: groupSales(sales, r => r.orderSource, k => SOURCE_LABELS[k] ?? k, totalSales),
    byPayment: groupSales(
      sales,
      r => (r.paymentMethod && r.paymentMethod !== 'other' ? r.paymentMethod : 'unrecorded'),
      k => PAYMENT_LABELS[k] ?? 'Not recorded (older orders)',
      totalSales
    ),
    byPeriod: [...buckets.values()].map(g => ({...g, amount: round2(g.amount)})),
    deposits: one(deposits),
    cancelled: one(cancelled),
    unpaidWalkIn: one(unpaidWalkIn),
    openOrders: one(openOrders),
    transactionFees: round2(feesAll[0]?.amount ?? 0),
    rows: sales
  };
}

// ---------------------------------------------------------------------------
// Product mix + inventory
// ---------------------------------------------------------------------------

export async function getProductData(range: ResolvedRange, sales?: SaleRow[]) {
  const saleRows = sales ?? (await fetchSales(range));
  const products = await ProductModel.find({}, {name: 1, category: 1, price: 1, stock: 1, isAvailable: 1}).lean();
  const byId = new Map(products.map(p => [String(p._id), p]));

  const mix = new Map<string, {qty: number; sales: number}>();
  for (const order of saleRows) {
    for (const item of order.items) {
      const key = String(item.productId);
      const g = mix.get(key) ?? {qty: 0, sales: 0};
      g.qty += item.quantity;
      g.sales += item.quantity * item.price;
      mix.set(key, g);
    }
  }
  const totalQty = [...mix.values()].reduce((a, g) => a + g.qty, 0);
  const totalSales = round2([...mix.values()].reduce((a, g) => a + g.sales, 0));

  const categories = new Map<string, Array<{name: string; qty: number; sales: number; qtyShare: number; salesShare: number}>>();
  for (const [id, g] of mix) {
    const p = byId.get(id);
    const category = p?.category?.trim() || 'Uncategorized';
    const list = categories.get(category) ?? [];
    list.push({
      name: p?.name ?? 'Deleted product',
      qty: g.qty,
      sales: round2(g.sales),
      qtyShare: share(g.qty, totalQty),
      salesShare: share(g.sales, totalSales)
    });
    categories.set(category, list);
  }
  const mixByCategory = [...categories.entries()]
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.sales - a.sales),
      qty: items.reduce((a, i) => a + i.qty, 0),
      sales: round2(items.reduce((a, i) => a + i.sales, 0))
    }))
    .sort((a, b) => b.sales - a.sales);

  const onHand = products
    .map(p => ({
      id: String(p._id),
      name: p.name,
      category: p.category?.trim() || 'Uncategorized',
      stock: p.stock ?? 0,
      price: p.price ?? 0,
      value: round2((p.stock ?? 0) * (p.price ?? 0)),
      available: p.isAvailable !== false
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  // Manual stock movements recorded in the period (restock / spoilage / adjustment).
  const movements = await StockMovementModel.aggregate([
    {$match: {createdAt: {$gte: range.from, $lt: range.to}, type: {$in: ['restock', 'spoilage', 'adjustment']}}},
    {
      $group: {
        _id: '$productId',
        received: {$sum: {$cond: [{$eq: ['$type', 'restock']}, {$subtract: ['$newStock', '$previousStock']}, 0]}},
        spoilage: {$sum: {$cond: [{$eq: ['$type', 'spoilage']}, {$subtract: ['$previousStock', '$newStock']}, 0]}},
        adjustments: {$sum: {$cond: [{$eq: ['$type', 'adjustment']}, {$subtract: ['$newStock', '$previousStock']}, 0]}}
      }
    }
  ]);
  const stockMovements = movements
    .map(m => {
      const p = byId.get(String(m._id));
      return {
        name: p?.name ?? 'Deleted product',
        received: m.received,
        spoilage: m.spoilage,
        spoilageValue: round2(m.spoilage * (p?.price ?? 0)),
        adjustments: m.adjustments
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // In stock but not a single unit sold in the period.
  const deadStock = onHand.filter(p => p.stock > 0 && !mix.has(p.id));

  return {
    mixByCategory,
    totalQty,
    totalSales,
    onHand,
    stockMovements,
    deadStock
  };
}

// ---------------------------------------------------------------------------
// Orders / operations
// ---------------------------------------------------------------------------

export async function getOrderData(range: ResolvedRange, sales?: SaleRow[]) {
  const saleRows = sales ?? (await fetchSales(range));
  const [statusRows, typeRows, reasonRows, openList, ops] = await Promise.all([
    OrderModel.aggregate([
      {$match: rangeFilter(range)},
      {$group: {_id: '$orderStatus', orders: {$sum: 1}, amount: {$sum: '$totalAmount'}}}
    ]),
    OrderModel.aggregate([
      {$match: rangeFilter(range)},
      {
        $group: {
          _id: '$orderType',
          placed: {$sum: 1},
          completed: {$sum: {$cond: [{$eq: ['$orderStatus', 'completed']}, 1, 0]}},
          cancelled: {$sum: {$cond: [{$eq: ['$orderStatus', 'cancelled']}, 1, 0]}}
        }
      }
    ]),
    OrderModel.aggregate([
      {$match: {...rangeFilter(range), orderStatus: 'cancelled'}},
      {$group: {_id: {$ifNull: ['$cancelReason', '']}, orders: {$sum: 1}}}
    ]),
    OrderModel.find(
      {...rangeFilter(range), orderStatus: {$in: OPEN_STATUSES}},
      {orderNumber: 1, createdAt: 1, orderType: 1, orderStatus: 1, totalAmount: 1}
    )
      .sort({createdAt: 1})
      .lean(),
    getReportOperations(range)
  ]);

  const totalPlaced = statusRows.reduce((a, r) => a + r.orders, 0);

  // "Completed" is split so it matches the Sales Report exactly: completed
  // walk-in orders that were never marked paid are not counted as sales.
  const completedRow = statusRows.find(r => r._id === 'completed');
  const saleOrders = saleRows.length;
  const saleAmount = sum(saleRows, r => r.totalAmount);
  const split = completedRow
    ? [
        {_id: 'completed_sale', orders: saleOrders, amount: saleAmount},
        ...(completedRow.orders - saleOrders > 0
          ? [{_id: 'completed_unpaid', orders: completedRow.orders - saleOrders, amount: completedRow.amount - saleAmount}]
          : [])
      ]
    : [];
  const statusOrder = ['completed_sale', 'completed_unpaid', 'cancelled', 'pending', 'confirmed', 'preparing', 'ready', 'on_the_way'];
  const labels: Record<string, string> = {
    ...STATUS_LABELS,
    completed_sale: 'Completed (counted as sales)',
    completed_unpaid: 'Completed walk-in, not marked paid'
  };
  const rowsWithSplit = [...split, ...statusRows.filter(r => r._id !== 'completed')];
  const byStatus = statusOrder
    .map(s => rowsWithSplit.find(r => r._id === s))
    .filter(Boolean)
    .map(r => ({key: r._id as string, label: labels[r._id] ?? r._id, orders: r.orders, amount: round2(r.amount), share: share(r.orders, totalPlaced)}));

  const cancelledTotal = statusRows.find(r => r._id === 'cancelled')?.orders ?? 0;
  const reasons = reasonRows
    .map(r => ({reason: String(r._id).trim() || 'No reason given', orders: r.orders, share: share(r.orders, cancelledTotal)}))
    .sort((a, b) => b.orders - a.orders);

  const byType = typeRows
    .map(r => ({label: ORDER_TYPE_LABELS[r._id] ?? r._id, placed: r.placed, completed: r.completed, cancelled: r.cancelled}))
    .sort((a, b) => b.placed - a.placed);

  const hours = new Map<number, {orders: number; amount: number}>();
  const weekdays = new Map<number, {orders: number; amount: number}>();
  for (const r of saleRows) {
    const p = manilaParts(new Date(r.createdAt));
    const h = hours.get(p.hour) ?? {orders: 0, amount: 0};
    h.orders += 1;
    h.amount += r.totalAmount;
    hours.set(p.hour, h);
    const w = weekdays.get(p.weekday) ?? {orders: 0, amount: 0};
    w.orders += 1;
    w.amount += r.totalAmount;
    weekdays.set(p.weekday, w);
  }
  const hourLabel = (h: number) => {
    const fmt = (x: number) => `${((x + 11) % 12) + 1}:00 ${x < 12 ? 'AM' : 'PM'}`;
    return `${fmt(h)} – ${fmt((h + 1) % 24)}`;
  };

  const now = Date.now();
  return {
    totalPlaced,
    byStatus,
    byType,
    cancelledTotal,
    reasons,
    fulfilment: ops.fulfilment,
    byHour: [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([h, g]) => ({label: hourLabel(h), orders: g.orders, amount: round2(g.amount)})),
    byWeekday: [1, 2, 3, 4, 5, 6, 0]
      .filter(d => weekdays.has(d))
      .map(d => ({label: WEEKDAYS[d], orders: weekdays.get(d)!.orders, amount: round2(weekdays.get(d)!.amount)})),
    openOrders: openList.map(o => ({
      ref: orderRef(o as any),
      placed: formatManilaDate(new Date(o.createdAt as any)),
      type: ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
      // Short labels keep each row on one line in the list.
      status: o.orderStatus === 'pending' ? 'Pending' : STATUS_LABELS[o.orderStatus] ?? o.orderStatus,
      daysOpen: Math.floor((now - new Date(o.createdAt as any).getTime()) / 86400000),
      amount: round2(o.totalAmount ?? 0)
    }))
  };
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function getCustomerData(range: ResolvedRange, sales?: SaleRow[]) {
  const saleRows = sales ?? (await fetchSales(range));
  const totalSales = sum(saleRows, r => r.totalAmount);

  const account = saleRows.filter(r => r.customerId);
  const guest = saleRows.filter(r => !r.customerId);

  const perCustomer = new Map<string, {orders: number; amount: number; last: Date}>();
  for (const r of account) {
    const k = String(r.customerId);
    const g = perCustomer.get(k) ?? {orders: 0, amount: 0, last: new Date(0)};
    g.orders += 1;
    g.amount += r.totalAmount;
    if (new Date(r.createdAt) > g.last) g.last = new Date(r.createdAt);
    perCustomer.set(k, g);
  }
  const ids = [...perCustomer.keys()].map(id => new mongoose.Types.ObjectId(id));

  const [customers, firstOrders, newAccounts] = await Promise.all([
    CustomerModel.find({_id: {$in: ids}}, {firstName: 1, lastName: 1}).lean(),
    // First-ever completed order of each buyer, to split new vs returning.
    OrderModel.aggregate([
      {$match: {customerId: {$in: ids}, ...SALE_MATCH}},
      {$group: {_id: '$customerId', first: {$min: '$createdAt'}}}
    ]),
    CustomerModel.countDocuments({createdAt: {$gte: range.from, $lt: range.to}})
  ]);
  const nameOf = new Map(customers.map(c => [String(c._id), `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Customer']));
  const firstOf = new Map(firstOrders.map(f => [String(f._id), new Date(f.first)]));

  let newBuyers = 0;
  for (const id of perCustomer.keys()) {
    const first = firstOf.get(id);
    if (first && first >= range.from) newBuyers += 1;
  }

  const top = [...perCustomer.entries()]
    .map(([id, g]) => ({
      name: nameOf.get(id) ?? `Deleted account (#${id.slice(-6).toUpperCase()})`,
      orders: g.orders,
      amount: round2(g.amount),
      share: share(g.amount, totalSales),
      last: formatManilaDate(g.last)
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  const accountSales = sum(account, r => r.totalAmount);
  const guestSales = sum(guest, r => r.totalAmount);

  return {
    buyers: perCustomer.size,
    newBuyers,
    returningBuyers: perCustomer.size - newBuyers,
    newAccounts,
    split: [
      {label: 'Registered customers', orders: account.length, amount: accountSales, share: share(accountSales, totalSales)},
      {label: 'Guests (no account)', orders: guest.length, amount: guestSales, share: share(guestSales, totalSales)}
    ],
    totalOrders: saleRows.length,
    totalSales,
    top,
    topCount: perCustomer.size
  };
}

export {fetchSales};
export type {SaleRow};
