import type {PipelineStage} from 'mongoose';
import {OrderModel} from '../models/Order.model';
import {OrderItemModel} from '../models/OrderItem.model';
import {ProductModel} from '../models/Product.model';
import {CustomerModel} from '../models/Customer.model';
import {CashierModel} from '../models/Cashier.model';
import {StockMovementModel} from '../models/StockMovement.model';
import {
  buildBuckets,
  bucketExpression,
  countManilaDays,
  manilaDayEndUtc,
  manilaDayStartUtc,
  percentDelta,
  safePercent,
  safeRatio,
  toManilaDayKey
} from '../utils/dateRange';
import type {ReportGranularity, ResolvedRange} from '../utils/dateRange';

/**
 * Every non-cancelled state. This is "order value placed", NOT money received,
 * and the difference matters: nothing in the current order model ever closes
 * an abandoned order, so a large share of these rows can be months old and
 * will never be fulfilled. Never present a total over this set as revenue.
 */
const REVENUE_STATUSES = [
  'pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'completed'
];

/** The only state where money has actually been collected. */
const REALIZED_STATUSES = ['completed'];

const OPEN_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'];

/**
 * An open order older than this is not "in the kitchen" any more, it is an
 * order nobody closed. A lechon house completes orders in hours, so anything
 * past a week is a process failure rather than a pending sale.
 */
const STALE_OPEN_DAYS = 7;

/**
 * Age bands for the stuck-order queue, youngest first. `minDays` is inclusive,
 * `maxDays` exclusive; `maxDays: null` means unbounded.
 */
const STALE_AGE_BUCKETS = [
  {key: 'week', label: '1-2 weeks', minDays: 7, maxDays: 14},
  {key: 'month', label: '2-4 weeks', minDays: 14, maxDays: 30},
  {key: 'quarter', label: '1-3 months', minDays: 30, maxDays: 90},
  {key: 'ancient', label: '3 months+', minDays: 90, maxDays: null}
] as const;

function staleBucketFor(ageDays: number): (typeof STALE_AGE_BUCKETS)[number] {
  return (
    STALE_AGE_BUCKETS.find(
      b => ageDays >= b.minDays && (b.maxDays === null || ageDays < b.maxDays)
    ) ?? STALE_AGE_BUCKETS[STALE_AGE_BUCKETS.length - 1]
  );
}

/** The moment the kitchen finished: `ready` for pickup, `on_the_way` for delivery. */
const KITCHEN_DONE_STATUSES = ['ready', 'on_the_way'];

export const REPORT_DIMENSIONS = [
  'product', 'category', 'customer', 'cashier', 'paymentMethod', 'orderType', 'orderSource'
] as const;

export type ReportDimension = (typeof REPORT_DIMENSIONS)[number];

export interface ReportKpi {
  key: string;
  label: string;
  value: number;
  /** Percentage change vs the immediately preceding window of equal length. Null when no baseline exists. */
  delta?: number | null;
  hint?: string;
  format: 'peso' | 'number' | 'percent' | 'minutes';
}

export interface ReportSummary {
  range: {preset: string; label: string; days: number; granularity: ReportGranularity};
  comparisonLabel: string;
  kpis: ReportKpi[];
  /**
   * Order value in the period split by whether it was actually collected.
   * `collected + open` reconciles to total order value, so the three figures
   * always add up and nothing is quietly folded into "revenue".
   */
  valueSplit: {
    collected: number;
    collectedOrders: number;
    open: number;
    openOrders: number;
    stale: number;
    staleOrders: number;
    oldestOpenDays: number | null;
    staleAfterDays: number;
  };
  customerMix: {
    unique: number;
    repeat: number;
    newCustomers: number;
    guestOrders: number;
    registeredOrders: number;
    repeatRate: number;
  };
  byOrderType: Array<{key: string; label: string; orders: number; revenue: number}>;
  byOrderSource: Array<{key: string; label: string; orders: number; revenue: number}>;
}

export interface ReportTimeseries {
  range: ReportSummary['range'];
  granularity: ReportGranularity;
  points: Array<{
    bucket: string;
    /** Collected revenue for the bucket. */
    revenue: number;
    orders: number;
    /** Value placed in the bucket that is still unfulfilled. */
    openRevenue: number;
    openOrders: number;
  }>;
}

export interface ReportBreakdownRow {
  key: string;
  label: string;
  secondary?: string | null;
  units: number;
  orders: number;
  revenue: number;
  share: number;
}

export interface ReportBreakdown {
  range: ReportSummary['range'];
  dimension: ReportDimension;
  rows: ReportBreakdownRow[];
  total: {units: number; orders: number; revenue: number};
  /**
   * Explains why a dimension's total may differ from headline revenue, so the
   * UI does not present an expected difference as a bug.
   */
  note?: string;
}

export interface ReportOperations {
  range: ReportSummary['range'];
  statusFunnel: Array<{status: string; count: number}>;
  live: {open: number; preparing: number; deliveriesToday: number; pickupsToday: number; reservationsOpen: number};
  /**
   * Open orders nobody closed, aged. `live.open` includes these, which is why
   * it can only grow and is not a workload signal.
   */
  staleOrders: {
    afterDays: number;
    count: number;
    value: number;
    oldestDays: number | null;
    byAge: Array<{label: string; minDays: number; maxDays: number | null; count: number; value: number}>;
    byType: Array<{key: string; label: string; count: number; value: number}>;
  };
  fulfilment: {
    measured: number;
    onTime: number;
    onTimeRate: number;
    avgActualMinutes: number;
    avgPromisedMinutes: number;
    worstMinutes: number;
  };
  cancellations: {cancelled: number; total: number; rate: number; reasons: Array<{reason: string; count: number}>};
  byHour: Array<{hour: number; orders: number; revenue: number}>;
  byWeekday: Array<{weekday: number; label: string; orders: number; revenue: number}>;
}

export interface ReportInventoryHealth {
  range: ReportSummary['range'];
  /** Unsold stock valued at menu price. There is no cost data, so this is not a margin figure. */
  stockValue: number;
  wastage: {units: number; cost: number; byProduct: Array<{key: string; label: string; units: number; cost: number}>};
  deadStock: Array<{key: string; label: string; stock: number; stockValue: number}>;
  slowMovers: Array<{key: string; label: string; units: number; revenue: number; stock: number}>;
  topSellers: Array<{key: string; label: string; units: number; revenue: number; stock: number}>;
}

interface TotalsRow {
  revenue: number;
  orders: number;
  units: number;
  subtotal: number;
  deliveryFees: number;
  customerIds: unknown[];
  guestOrders: number;
}

function rangeMatch(from: Date, to: Date) {
  return {createdAt: {$gte: from, $lt: to}};
}

const LABEL_BY_ORDER_TYPE: Record<string, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  reservation: 'Reservation'
};

const LABEL_BY_ORDER_SOURCE: Record<string, string> = {
  online: 'Online',
  'in-store': 'In-store'
};

const LABEL_BY_PAYMENT: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  gcash: 'GCash',
  other: 'Other'
};

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function titleCase(value: string): string {
  if (!value) return 'Uncategorised';
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function peso(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * One pass over orders, with the line items joined in so units and gross
 * subtotal are available. Discount is the residual: what the menu prices came
 * to, minus what was actually charged. This mirrors receipt.service.ts.
 */
function totalsPipeline(from: Date, to: Date, statuses: string[]): PipelineStage[] {
  return [
    {$match: {createdAt: rangeMatch(from, to).createdAt, orderStatus: {$in: statuses}}},
    {$lookup: {from: 'order_items', localField: '_id', foreignField: 'orderId', as: 'items'}},
    {
      $addFields: {
        lineSubtotal: {
          $reduce: {
            input: '$items',
            initialValue: 0,
            in: {$add: ['$$value', {$multiply: ['$$this.quantity', '$$this.price']}]}
          }
        },
        lineUnits: {
          $reduce: {
            input: '$items',
            initialValue: 0,
            in: {$add: ['$$value', '$$this.quantity']}
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        revenue: {$sum: '$totalAmount'},
        orders: {$sum: 1},
        units: {$sum: '$lineUnits'},
        subtotal: {$sum: '$lineSubtotal'},
        deliveryFees: {$sum: {$ifNull: ['$deliveryFee', 0]}},
        customerIds: {$addToSet: '$customerId'},
        guestOrders: {$sum: {$cond: [{$eq: ['$isGuest', true]}, 1, 0]}}
      }
    }
  ];
}

async function fetchTotals(from: Date, to: Date, statuses: string[] = REVENUE_STATUSES): Promise<TotalsRow> {
  const [row] = await OrderModel.aggregate(totalsPipeline(from, to, statuses));
  return (
    row ?? {
      revenue: 0,
      orders: 0,
      units: 0,
      subtotal: 0,
      deliveryFees: 0,
      customerIds: [],
      guestOrders: 0
    }
  );
}

/**
 * Splits order value in the window into collected / open / stale so the UI
 * can stop presenting unfilled orders as money. Single pass, `$facet`, so the
 * three figures are guaranteed to reconcile with each other.
 */
async function fetchValueSplit(
  from: Date,
  to: Date
): Promise<ReportSummary['valueSplit']> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_OPEN_DAYS * 86400000);

  const [row] = await OrderModel.aggregate([
    {$match: {createdAt: rangeMatch(from, to).createdAt, orderStatus: {$in: REVENUE_STATUSES}}},
    {
      $facet: {
        collected: [
          {$match: {orderStatus: {$in: REALIZED_STATUSES}}},
          {$group: {_id: null, value: {$sum: '$totalAmount'}, orders: {$sum: 1}}}
        ],
        open: [
          {$match: {orderStatus: {$in: OPEN_STATUSES}}},
          {
            $group: {
              _id: null,
              value: {$sum: '$totalAmount'},
              orders: {$sum: 1},
              oldest: {$min: '$createdAt'},
              staleValue: {
                $sum: {
                  $cond: [{$lt: ['$createdAt', staleBefore]}, '$totalAmount', 0]
                }
              },
              staleOrders: {
                $sum: {
                  $cond: [{$lt: ['$createdAt', staleBefore]}, 1, 0]
                }
              }
            }
          }
        ]
      }
    }
  ]);

  const collected = row?.collected?.[0] ?? {value: 0, orders: 0};
  const open = row?.open?.[0] ?? {
    value: 0,
    orders: 0,
    oldest: null as Date | null,
    staleValue: 0,
    staleOrders: 0
  };

  return {
    collected: peso(collected.value ?? 0),
    collectedOrders: collected.orders ?? 0,
    open: peso(open.value ?? 0),
    openOrders: open.orders ?? 0,
    stale: peso(open.staleValue ?? 0),
    staleOrders: open.staleOrders ?? 0,
    oldestOpenDays: open.oldest
      ? Math.floor((now.getTime() - new Date(open.oldest).getTime()) / 86400000)
      : null,
    staleAfterDays: STALE_OPEN_DAYS
  };
}

export async function getReportSummary(range: ResolvedRange): Promise<ReportSummary> {
  const [current, previous, split, cancelled, totalOrders, newCustomers, returningOrders, typeAgg, sourceAgg] =
    await Promise.all([
      // Realized only: money the business actually collected inside the window.
      fetchTotals(range.from, range.to, REALIZED_STATUSES),
      fetchTotals(range.prevFrom, range.prevTo, REALIZED_STATUSES),
      fetchValueSplit(range.from, range.to),
      OrderModel.countDocuments({
        createdAt: rangeMatch(range.from, range.to).createdAt,
        orderStatus: 'cancelled'
      }),
      OrderModel.countDocuments({createdAt: rangeMatch(range.from, range.to).createdAt}),
      CustomerModel.countDocuments({createdAt: rangeMatch(range.from, range.to).createdAt}),
      OrderModel.aggregate([
        {
          $match: {
            createdAt: rangeMatch(range.from, range.to).createdAt,
            customerId: {$ne: null},
            orderStatus: {$in: REALIZED_STATUSES}
          }
        },
        { $group: {_id: '$customerId'}},
        {
          $lookup: {
            from: 'orders',
            let: {cid: '$_id'},
            pipeline: [
              {
                // Inside $expr every operator needs an argument array, not the
                // `{field: {$op: value}}` query form.
                $match: {
                  $expr: {
                    $and: [
                      {$eq: ['$customerId', '$$cid']},
                      {$lt: ['$createdAt', range.from]}
                    ]
                  }
                }
              },
              { $limit: 1}
            ],
            as: 'prior'
          }
        },
        {$match: {prior: {$eq: []}}},
        {$count: 'count'}
      ]),
      OrderModel.aggregate([
        {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
        {$group: {_id: '$orderType', orders: {$sum: 1}, revenue: {$sum: '$totalAmount'}}}
      ]),
      OrderModel.aggregate([
        {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
        {
          // Older orders predate `orderSource`; the schema default is 'online'.
          $group: {
            _id: {$ifNull: ['$orderSource', 'online']},
            orders: {$sum: 1},
            revenue: {$sum: '$totalAmount'}
          }
        }
      ])
    ]);

  const previousAov = safeRatio(previous.revenue, previous.orders);
  const currentAov = safeRatio(current.revenue, current.orders);
  const discount = peso(Math.max(0, current.subtotal - current.revenue));
  const uniqueCustomers = current.customerIds.filter(id => id !== null).length;
  const previousUnique = previous.customerIds.filter(id => id !== null).length;
  const returning = returningOrders[0]?.count ?? 0;
  const repeatRate = safePercent(returning, uniqueCustomers);
  // `collected + open` is total order value; the share keeps the headline
  // honest about how much of it is actually banked.
  const orderValue = peso(split.collected + split.open);
  const realizedShare = safePercent(split.collected, orderValue);
  const unfilled = totalOrders - current.orders - cancelled;

  const kpis: ReportKpi[] = [
    {
      key: 'revenue',
      label: 'Revenue Collected',
      value: peso(current.revenue),
      delta: percentDelta(current.revenue, previous.revenue),
      hint: `Completed orders only · ${realizedShare}% of ${peso(orderValue)} ordered`,
      format: 'peso'
    },
    {
      key: 'openValue',
      label: 'Still Open',
      value: split.open,
      hint: `Not yet collected · ${split.openOrders} order${split.openOrders === 1 ? '' : 's'}`,
      format: 'peso'
    },
    {
      key: 'staleOrders',
      label: 'Stuck Orders',
      value: split.staleOrders,
      hint: split.staleOrders
        ? `${peso(split.stale)} at risk · open ${split.staleAfterDays}d+ · oldest ${
            split.oldestOpenDays ?? 0
          }d`
        : `Nothing open longer than ${split.staleAfterDays} days`,
      format: 'number'
    },
    {
      key: 'orders',
      label: 'Orders Completed',
      value: current.orders,
      delta: percentDelta(current.orders, previous.orders),
      hint: unfilled > 0 ? `${unfilled} placed but never completed` : 'All placed orders completed',
      format: 'number'
    },
    {
      key: 'aov',
      label: 'Avg Order Value',
      value: currentAov,
      delta: percentDelta(currentAov, previousAov),
      hint: 'Collected revenue ÷ completed orders',
      format: 'peso'
    },
    {
      key: 'units',
      label: 'Units Sold',
      value: current.units,
      delta: percentDelta(current.units, previous.units),
      hint: 'From completed orders',
      format: 'number'
    },
    {
      key: 'discount',
      label: 'Discount Given',
      value: discount,
      hint: 'Menu price minus amount charged',
      format: 'peso'
    },
    {
      key: 'deliveryFees',
      label: 'Delivery Fees',
      value: peso(current.deliveryFees),
      hint: 'Collected on completed deliveries',
      format: 'peso'
    },
    {
      key: 'customers',
      label: 'Unique Customers',
      value: uniqueCustomers,
      delta: percentDelta(uniqueCustomers, previousUnique),
      hint: `+${newCustomers} new · ${repeatRate}% repeat`,
      format: 'number'
    },
    {
      key: 'cancellationRate',
      label: 'Cancellation Rate',
      value: safePercent(cancelled, totalOrders),
      hint: `${cancelled} of ${totalOrders} orders · ${unfilled} never closed`,
      format: 'percent'
    }
  ];

  const shapeOrderMix = (rows: Array<{_id: string; orders: number; revenue: number}>, labels: Record<string, string>) =>
    rows
      .map(r => ({
        key: r._id ?? 'unknown',
        label: labels[r._id] ?? titleCase(r._id ?? 'unknown'),
        orders: r.orders,
        revenue: peso(r.revenue)
      }))
      .sort((a, b) => b.revenue - a.revenue);

  return {
    range: {
      preset: range.preset,
      label: range.label,
      days: range.days,
      granularity: range.granularity
    },
    comparisonLabel: formatComparisonLabel(range),
    kpis,
    valueSplit: split,
    customerMix: {
      unique: uniqueCustomers,
      repeat: returning,
      newCustomers,
      guestOrders: current.guestOrders,
      registeredOrders: current.orders - current.guestOrders,
      repeatRate
    },
    byOrderType: shapeOrderMix(typeAgg, LABEL_BY_ORDER_TYPE),
    byOrderSource: shapeOrderMix(sourceAgg, LABEL_BY_ORDER_SOURCE)
  };
}

function formatComparisonLabel(range: ResolvedRange): string {
  const days = countManilaDays(range.prevFrom, range.prevTo);
  if (range.preset === 'thisMonth' || range.preset === 'lastMonth') return 'vs previous month';
  if (range.preset === 'today') return 'vs yesterday';
  return `vs previous ${days} days`;
}

export async function getReportTimeseries(
  range: ResolvedRange,
  granularity?: ReportGranularity
): Promise<ReportTimeseries> {
  const bucketSize = granularity ?? range.granularity;

  // Deliberately no order_items join here: the chart only needs money and
  // order counts, and this endpoint renders on every view switch. Grouped over
  // all non-cancelled states so collected and still-open can be separated
  // per bucket instead of collapsed into one "revenue" line.
  const rows = await OrderModel.aggregate([
    {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REVENUE_STATUSES}}},
    {
      $group: {
        _id: bucketExpression('createdAt', bucketSize),
        collected: {
          $sum: {$cond: [{$in: ['$orderStatus', REALIZED_STATUSES]}, '$totalAmount', 0]}
        },
        open: {
          $sum: {$cond: [{$in: ['$orderStatus', OPEN_STATUSES]}, '$totalAmount', 0]}
        },
        collectedOrders: {
          $sum: {$cond: [{$in: ['$orderStatus', REALIZED_STATUSES]}, 1, 0]}
        },
        openOrders: {
          $sum: {$cond: [{$in: ['$orderStatus', OPEN_STATUSES]}, 1, 0]}
        }
      }
    }
  ]);

  const byBucket = new Map<
    string,
    {collected: number; open: number; collectedOrders: number; openOrders: number}
  >();
  for (const row of rows) {
    byBucket.set(row._id as string, {
      collected: peso(row.collected as number),
      open: peso(row.open as number),
      collectedOrders: row.collectedOrders as number,
      openOrders: row.openOrders as number
    });
  }

  const points = buildBuckets(range.from, range.to, bucketSize).map(bucket => {
    const hit = byBucket.get(bucket);
    return {
      bucket,
      // Collected stays the primary series; `revenue` is aliased to it so the
      // existing chart and PDF code keep working unchanged.
      revenue: hit?.collected ?? 0,
      orders: hit?.collectedOrders ?? 0,
      openRevenue: hit?.open ?? 0,
      openOrders: hit?.openOrders ?? 0
    };
  });

  return {
    range: {
      preset: range.preset,
      label: range.label,
      days: range.days,
      granularity: bucketSize
    },
    granularity: bucketSize,
    points
  };
}

interface RawGroupRow {
  _id: unknown;
  label?: string;
  secondary?: string | null;
  units: number;
  orders: number;
  revenue: number;
}

/** Matches sales rows to a product, tolerating deleted products. */
const LOOKUP_PRODUCT = {
  $lookup: {from: 'products', localField: 'productId', foreignField: '_id', as: 'product'}
};
const UNWIND_PRODUCT = {$unwind: {path: '$product', preserveNullAndEmptyArrays: true}};

async function productSales(from: Date, to: Date) {
  return OrderItemModel.aggregate([
    {$lookup: {from: 'orders', localField: 'orderId', foreignField: '_id', as: 'order'}},
    {$unwind: '$order'},
    {
      $match: {
        'order.orderStatus': {$in: REALIZED_STATUSES},
        'order.createdAt': rangeMatch(from, to).createdAt
      }
    },
    LOOKUP_PRODUCT,
    UNWIND_PRODUCT,
    {
      $group: {
        _id: '$productId',
        // `order_items` stores no name snapshot, so a deleted product would
        // otherwise vanish from history. Keep the revenue and say so instead.
        name: {$first: {$ifNull: ['$product.name', 'Deleted product']}},
        category: {$first: {$ifNull: ['$product.category', 'Uncategorised']}},
        units: {$sum: '$quantity'},
        revenue: {$sum: {$multiply: ['$quantity', '$price']}},
        orderIds: {$addToSet: '$orderId'}
      }
    }
  ]);
}

async function orderDimension(
  from: Date,
  to: Date,
  groupField: string,
  enrich: PipelineStage[]
): Promise<RawGroupRow[]> {
  return OrderModel.aggregate([
    {$match: {createdAt: rangeMatch(from, to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
    {$group: {_id: `$${groupField}`, orders: {$sum: 1}, revenue: {$sum: '$totalAmount'}}},
    ...enrich
  ]) as Promise<RawGroupRow[]>;
}

async function buildBreakdown(
  range: ResolvedRange,
  dimension: ReportDimension,
  limit: number
): Promise<ReportBreakdown> {
  let rows: RawGroupRow[] = [];

  if (dimension === 'product') {
    rows = (await productSales(range.from, range.to)).map(r => ({
      _id: r._id,
      label: r.name,
      secondary: r.category,
      units: r.units,
      orders: r.orderIds.length,
      revenue: peso(r.revenue)
    }));
  } else if (dimension === 'category') {
    rows = (await productSales(range.from, range.to)).map(r => ({
      _id: r.category,
      label: titleCase(r.category),
      units: r.units,
      orders: r.orderIds.length,
      revenue: peso(r.revenue)
    }));
  } else if (dimension === 'customer') {
    const orderRows = await OrderModel.aggregate([
      {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
      {
        $group: {
          _id: '$customerId',
          orders: {$sum: 1},
          revenue: {$sum: '$totalAmount'},
          units: {$sum: {$cond: ['$isGuest', 0, 1]}},
          guestNames: {$addToSet: '$guestInfo.firstName'}
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {$unwind: {path: '$customer', preserveNullAndEmptyArrays: true}},
      {
        $project: {
          name: {
            $ifNull: [
              {
                $concat: [
                  {$ifNull: ['$customer.firstName', '']},
                  ' ',
                  {$ifNull: ['$customer.lastName', '']}
                ]
              },
              {$concat: [{$ifNull: [{$arrayElemAt: ['$guestNames', 0]}, 'Guest']}, ' (guest)']}
            ]
          },
          email: '$customer.email',
          orders: 1,
          revenue: 1,
          units: 1
        }
      },
      {$sort: {revenue: -1}}
    ]);
    rows = orderRows.map(r => ({
      _id: (r._id as string) ?? 'guest',
      label: ((r.name as string) ?? '').trim() || 'Guest',
      secondary: (r.email as string) ?? null,
      orders: r.orders,
      revenue: peso(r.revenue),
      units: r.units
    }));
  } else if (dimension === 'cashier' || dimension === 'paymentMethod') {
    // Requires joining `transactions`, which is why these two are the slowest
    // views. `transaction.orderId` carries a unique index, so each join is a
    // direct hit rather than a scan.
    const isCashier = dimension === 'cashier';
    // Online orders are paid without a cashier, so they are bucketed explicitly
    // instead of dropped — otherwise the cashier list would not add up to the
    // period revenue and the owner would have no way to reconcile the two.
    const group = {
      _id: {$ifNull: [isCashier ? '$tx.cashierId' : '$tx.paymentMethod', 'online']},
      orders: {$sum: 1},
      revenue: {$sum: '$totalAmount'}
    };

    const raw = await OrderModel.aggregate([
      {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
      {$lookup: {from: 'transactions', localField: '_id', foreignField: 'orderId', as: 'tx'}},
      {$unwind: '$tx'},
      {$group: group},
      ...(isCashier
        ? [
            {$lookup: {from: 'cashiers', localField: '_id', foreignField: '_id', as: 'cashier'}},
            {$unwind: {path: '$cashier', preserveNullAndEmptyArrays: true}},
            {
              $project: {
                name: {
                  $cond: [
                    {$eq: ['$_id', 'online']},
                    'Online (no cashier)',
                    {
                      $ifNull: [
                        {$concat: ['$cashier.firstName', ' ', '$cashier.lastName']},
                        'Removed cashier'
                      ]
                    }
                  ]
                },
                orders: 1,
                revenue: 1
              }
            }
          ]
        : [{ $project: {orders: 1, revenue: 1} }]),
      {$sort: {revenue: -1}}
    ]);

    rows = raw.map(r => {
      const key = String(r._id ?? 'unknown');
      return {
        _id: key,
        label: isCashier
          ? ((r.name as string) ?? 'Unknown')
          : LABEL_BY_PAYMENT[key] ?? titleCase(key),
        orders: r.orders,
        revenue: peso(r.revenue),
        units: 0
      };
    });
  } else if (dimension === 'orderType') {
    const raw = await orderDimension(range.from, range.to, 'orderType', []);
    rows = raw.map(r => ({
      _id: r._id,
      label: LABEL_BY_ORDER_TYPE[r._id as string] ?? titleCase(String(r._id)),
      orders: r.orders,
      revenue: peso(r.revenue),
      units: 0
    }));
  } else {
    const raw = await orderDimension(range.from, range.to, 'orderSource', []);
    rows = raw.map(r => ({
      _id: r._id,
      label: LABEL_BY_ORDER_SOURCE[r._id as string] ?? titleCase(String(r._id)),
      orders: r.orders,
      revenue: peso(r.revenue),
      units: 0
    }));
  }

  // Category groups arrive pre-merged per product, so fold them here.
  if (dimension === 'category') {
    const folded = new Map<string, RawGroupRow>();
    for (const row of rows) {
      const key = String(row._id);
      const existing = folded.get(key);
      if (existing) {
        existing.units += row.units;
        existing.orders += row.orders;
        existing.revenue = peso(existing.revenue + row.revenue);
      } else {
        folded.set(key, {...row});
      }
    }
    rows = Array.from(folded.values());
  }

  const sorted = rows
    .map(r => ({
      key: String(r._id ?? 'unknown'),
      label: (r.label as string) ?? 'Unknown',
      secondary: r.secondary ?? null,
      units: r.units ?? 0,
      orders: r.orders ?? 0,
      revenue: peso(r.revenue ?? 0),
      share: 0
    }))
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units);

  const totalRevenue = sorted.reduce((sum, r) => sum + r.revenue, 0);
  for (const row of sorted) {
    row.share = safePercent(row.revenue, totalRevenue);
  }

  // Product/category revenue is built from order line items, so it excludes the
  // delivery fees that are part of collected revenue, and carries the per-line
  // rounding that `totalAmount` smooths out. Say so rather than let the two
  // totals look like they should match exactly.
  const note =
    dimension === 'product' || dimension === 'category'
      ? 'Menu revenue from order line items on completed orders. Excludes delivery fees and per-line rounding, so it sits slightly below Revenue Collected.'
      : undefined;

  return {
    range: {
      preset: range.preset,
      label: range.label,
      days: range.days,
      granularity: range.granularity
    },
    dimension,
    rows: sorted.slice(0, limit),
    total: {
      units: sorted.reduce((s, r) => s + r.units, 0),
      orders: sorted.reduce((s, r) => s + r.orders, 0),
      revenue: peso(totalRevenue)
    },
    note
  };
}

export async function getReportBreakdown(
  range: ResolvedRange,
  dimension: ReportDimension,
  limit = 50
): Promise<ReportBreakdown> {
  return buildBreakdown(range, dimension, limit);
}

export async function getReportOperations(range: ResolvedRange): Promise<ReportOperations> {
  const now = new Date();
  const todayStart = manilaDayStartUtc(now);
  const todayEnd = manilaDayEndUtc(now);
  const staleCutoff = new Date(now.getTime() - STALE_OPEN_DAYS * 86400000);

  const [
    statusFunnel,
    openAgg,
    preparingAgg,
    todayAgg,
    fulfilment,
    cancellationAgg,
    byHour,
    byWeekday,
    staleTotals,
    staleByAge,
    staleByType
  ] =
    await Promise.all([
    OrderModel.aggregate([
      {$match: {createdAt: rangeMatch(range.from, range.to).createdAt}},
      {$group: {_id: '$orderStatus', count: {$sum: 1}}},
      {$sort: {count: -1}}
    ]),
    OrderModel.countDocuments({orderStatus: {$in: OPEN_STATUSES}}),
    OrderModel.countDocuments({orderStatus: 'preparing'}),
    OrderModel.aggregate([
      {$match: {createdAt: {$gte: todayStart, $lt: todayEnd}, orderStatus: {$in: OPEN_STATUSES}}},
      {$group: {_id: '$orderType', count: {$sum: 1}}}
    ]),
    // Reservations and walk-in POS orders have no promise attached, matching
    // isTrackableOrder() in prepTime.service.ts.
    OrderModel.aggregate([
      {
        $match: {
          createdAt: rangeMatch(range.from, range.to).createdAt,
          orderType: {$ne: 'reservation'},
          orderSource: {$ne: 'in-store'},
          estimatedReadyAt: {$ne: null}
        }
      },
      {$unwind: '$statusHistory'},
      {$match: {'statusHistory.status': {$in: KITCHEN_DONE_STATUSES}}},
      {
        $group: {
          _id: '$_id',
          createdAt: {$first: '$createdAt'},
          promisedAt: {$first: '$estimatedReadyAt'},
          promisedMinutes: {$first: '$estimatedPrepMinutes'},
          kitchenDoneAt: {$first: '$statusHistory.at'}
        }
      },
      {
        $group: {
          _id: null,
          measured: {$sum: 1},
          onTime: {
            $sum: {$cond: [{$lte: ['$kitchenDoneAt', '$promisedAt']}, 1, 0]}
          },
          avgActualMinutes: {
            $avg: {$divide: [{$subtract: ['$kitchenDoneAt', '$createdAt']}, 60000]}
          },
          avgPromisedMinutes: {$avg: '$promisedMinutes'},
          worstMinutes: {
            $max: {$divide: [{$subtract: ['$kitchenDoneAt', '$createdAt']}, 60000]}
          }
        }
      }
    ]),
    OrderModel.aggregate([
      {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: 'cancelled'}},
      {
        $group: {
          // $ifNull alone does not help here: a blank string is a real value.
          _id: {
            $cond: [
              {$gt: [{$strLenCP: {$trim: {input: {$ifNull: ['$cancelReason', '']}}}}, 0]},
              {$trim: {input: '$cancelReason'}},
              'No reason given'
            ]
          },
          count: {$sum: 1}
        }
      },
      {$sort: {count: -1}},
      {$limit: 8}
    ]),
    // Hour buckets are Manila wall-clock, so shift into local time before extracting.
    OrderModel.aggregate([
      {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
      {$addFields: {localHour: {$hour: {date: '$createdAt', timezone: 'Asia/Manila'}}}},
      {$group: {_id: '$localHour', orders: {$sum: 1}, revenue: {$sum: '$totalAmount'}}},
      {$sort: {_id: 1}}
    ]),
    OrderModel.aggregate([
      {$match: {createdAt: rangeMatch(range.from, range.to).createdAt, orderStatus: {$in: REALIZED_STATUSES}}},
      {$addFields: {localWeekday: {$dayOfWeek: {date: '$createdAt', timezone: 'Asia/Manila'}}}},
      {$group: {_id: '$localWeekday', orders: {$sum: 1}, revenue: {$sum: '$totalAmount'}}},
      {$sort: {_id: 1}}
    ]),
    // Stuck orders are measured across all history, not the selected range: an
    // order abandoned four months ago is still sitting in the queue today, and
    // that is the whole point of surfacing it.
    OrderModel.aggregate([
      {$match: {orderStatus: {$in: OPEN_STATUSES}, createdAt: {$lt: staleCutoff}}},
      {$group: {_id: null, count: {$sum: 1}, value: {$sum: '$totalAmount'}, oldest: {$min: '$createdAt'}}}
    ]),
    // Grouped by exact age, then banded in JS. A `$switch` inside `$group._id`
    // only evaluates its first branch on this server, which would file every
    // stuck order under "1-2 weeks" and hide the months-old tail.
    OrderModel.aggregate([
      {$match: {orderStatus: {$in: OPEN_STATUSES}, createdAt: {$lt: staleCutoff}}},
      {
        $project: {
          ageDays: {$floor: {$divide: [{$subtract: ['$$NOW', '$createdAt']}, 86400000]}},
          value: '$totalAmount'
        }
      },
      {$group: {_id: '$ageDays', count: {$sum: 1}, value: {$sum: '$value'}}},
      {$sort: {_id: 1}}
    ]),
    OrderModel.aggregate([
      {$match: {orderStatus: {$in: OPEN_STATUSES}, createdAt: {$lt: staleCutoff}}},
      {$group: {_id: '$orderType', count: {$sum: 1}, value: {$sum: '$totalAmount'}}},
      {$sort: {value: -1}}
    ])
  ]);

  const totalOrders = statusFunnel.reduce((sum, r) => sum + r.count, 0);
  const cancelled = statusFunnel.find(r => r._id === 'cancelled')?.count ?? 0;
  const fulfilmentRow = fulfilment[0] ?? {};

  const todayByType = new Map<string, number>(todayAgg.map(r => [r._id, r.count]));
  const staleRow = staleTotals[0] ?? {};

  // Band the per-age counts, then keep only non-empty bands for display.
  const banded = new Map<string, {count: number; value: number}>();
  for (const row of staleByAge) {
    const bucket = staleBucketFor(row._id as number);
    const current = banded.get(bucket.key) ?? {count: 0, value: 0};
    current.count += row.count as number;
    current.value += (row.value as number) ?? 0;
    banded.set(bucket.key, current);
  }

  return {
    range: {
      preset: range.preset,
      label: range.label,
      days: range.days,
      granularity: range.granularity
    },
    statusFunnel: statusFunnel.map(r => ({status: r._id, count: r.count})),
    live: {
      open: openAgg,
      preparing: preparingAgg,
      deliveriesToday: todayByType.get('delivery') ?? 0,
      pickupsToday: todayByType.get('pickup') ?? 0,
      reservationsOpen: todayByType.get('reservation') ?? 0
    },
    staleOrders: {
      afterDays: STALE_OPEN_DAYS,
      count: staleRow.count ?? 0,
      value: peso(staleRow.value ?? 0),
      oldestDays: staleRow.oldest
        ? Math.floor((now.getTime() - new Date(staleRow.oldest).getTime()) / 86400000)
        : null,
      byAge: STALE_AGE_BUCKETS.map(bucket => {
        const hit = banded.get(bucket.key);
        return {
          label: bucket.label,
          minDays: bucket.minDays,
          maxDays: bucket.maxDays,
          count: hit?.count ?? 0,
          value: peso(hit?.value ?? 0)
        };
      }),
      byType: staleByType.map(r => ({
        key: r._id ?? 'unknown',
        label: LABEL_BY_ORDER_TYPE[r._id] ?? titleCase(r._id ?? 'unknown'),
        count: r.count,
        value: peso(r.value)
      }))
    },
    fulfilment: {
      measured: fulfilmentRow.measured ?? 0,
      onTime: fulfilmentRow.onTime ?? 0,
      onTimeRate: safePercent(fulfilmentRow.onTime ?? 0, fulfilmentRow.measured ?? 0),
      avgActualMinutes: Math.round(fulfilmentRow.avgActualMinutes ?? 0),
      avgPromisedMinutes: Math.round(fulfilmentRow.avgPromisedMinutes ?? 0),
      worstMinutes: Math.round(fulfilmentRow.worstMinutes ?? 0)
    },
    cancellations: {
      cancelled,
      total: totalOrders,
      rate: safeRatio(cancelled * 100, totalOrders),
      reasons: cancellationAgg.map(r => ({reason: r._id, count: r.count}))
    },
    byHour: Array.from({length: 24}, (_, hour) => {
      const hit = byHour.find(r => r._id === hour);
      return {hour, orders: hit?.orders ?? 0, revenue: peso(hit?.revenue ?? 0)};
    }),
    byWeekday: Array.from({length: 7}, (_, index) => {
      // Mongo's $dayOfWeek: 1 = Sunday .. 7 = Saturday.
      const hit = byWeekday.find(r => r._id === index + 1);
      return {
        weekday: index,
        label: WEEKDAY_LABELS[index],
        orders: hit?.orders ?? 0,
        revenue: peso(hit?.revenue ?? 0)
      };
    })
  };
}

export async function getReportInventoryHealth(
  range: ResolvedRange
): Promise<ReportInventoryHealth> {
  const [sales, products, wastage, stockValueRow] = await Promise.all([
    productSales(range.from, range.to),
    ProductModel.find({}).select('name category stock price stockUnit isAvailable').lean(),
    StockMovementModel.aggregate([
      {
        $match: {
          createdAt: rangeMatch(range.from, range.to).createdAt,
          // `sold` is never written, and restocks are inflows, so only losses count.
          type: {$in: ['spoilage', 'adjustment']},
          quantity: {$lt: 0}
        }
      },
      LOOKUP_PRODUCT,
      UNWIND_PRODUCT,
      {
        $group: {
          _id: '$productId',
          name: {$first: {$ifNull: ['$product.name', 'Deleted product']}},
          units: {$sum: '$quantity'},
          cost: {$sum: {$multiply: ['$quantity', '$product.price']}}
        }
      },
      {$sort: {cost: 1}}
    ]),
    ProductModel.aggregate([{$group: {_id: null, value: {$sum: {$multiply: ['$stock', '$price']}}}}])
  ]);

  const salesByProduct = new Map<string, {units: number; revenue: number}>(
    sales.map(s => [String(s._id), {units: s.units, revenue: s.revenue}])
  );

  const catalogue = products.map(p => {
    const key = String(p._id);
    const sold = salesByProduct.get(key);
    const stock = p.stock ?? 0;
    return {
      key,
      label: p.name,
      category: p.category,
      units: sold?.units ?? 0,
      revenue: peso(sold?.revenue ?? 0),
      stock,
      stockValue: peso(stock * p.price)
    };
  });

  const deadStock = catalogue
    .filter(p => p.units === 0 && p.stock > 0)
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 20)
    .map(p => ({key: p.key, label: p.label, stock: p.stock, stockValue: p.stockValue}));

  const slowMovers = catalogue
    .filter(p => p.units > 0 && p.units <= 3)
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 20)
    .map(p => ({key: p.key, label: p.label, units: p.units, revenue: p.revenue, stock: p.stock}));

  const topSellers = [...catalogue]
    .filter(p => p.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, 20)
    .map(p => ({key: p.key, label: p.label, units: p.units, revenue: p.revenue, stock: p.stock}));

  const wastageRows = wastage.map(w => ({
    key: String(w._id),
    label: w.name as string,
    units: Math.abs(w.units as number),
    cost: peso(Math.abs(w.cost as number))
  }));

  return {
    range: {
      preset: range.preset,
      label: range.label,
      days: range.days,
      granularity: range.granularity
    },
    stockValue: peso(stockValueRow[0]?.value ?? 0),
    wastage: {
      units: wastageRows.reduce((s, r) => s + r.units, 0),
      cost: peso(wastageRows.reduce((s, r) => s + r.cost, 0)),
      byProduct: wastageRows.slice(0, 20)
    },
    deadStock,
    slowMovers,
    topSellers
  };
}

/** Today's Manila day key, used by the PDF footer. */
export function todayManilaKey(): string {
  return toManilaDayKey(new Date());
}
