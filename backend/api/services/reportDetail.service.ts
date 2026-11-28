import mongoose from 'mongoose';
import {OrderModel} from '../models/Order.model';
import {OrderItemModel} from '../models/OrderItem.model';
import {CustomerModel} from '../models/Customer.model';
import {StaffActivityModel} from '../models/StaffActivity.model';
import {cashierRepository} from '../repositories/cashier.repository';
import type {ResolvedRange} from '../utils/dateRange';
import {toManilaDayKey} from '../utils/dateRange';
import {
  ORDER_TYPE_LABELS,
  PAYMENT_LABELS,
  SALE_MATCH,
  SOURCE_LABELS,
  STATUS_LABELS,
  round2
} from './reportData.service';

/**
 * Detailed reports: the row-by-row tables behind each summary report tab
 * (Reports > Summary | Detailed). Every view returns the same generic shape,
 * so the page renders one table and the CSV export writes the same rows.
 */

export const DETAIL_VIEWS = ['sales', 'operations', 'products', 'customers', 'staff'] as const;
export type DetailView = (typeof DETAIL_VIEWS)[number];

export type DetailColumn = {
  key: string;
  label: string;
  type?: 'text' | 'money' | 'number' | 'datetime' | 'date';
};

export type DetailFilters = {
  cashierId?: string;
  orderType?: string;
  paymentMethod?: string;
  status?: string;
  /** Staff view: staff name or order number. */
  search?: string;
  /** Staff view: cashiers online / offline right now. */
  presence?: 'online' | 'offline';
};

export type DetailResult = {
  view: DetailView;
  columns: DetailColumn[];
  rows: Array<Record<string, string | number | null>>;
  /** Totals over ALL matching rows (not just this page), keyed like columns. */
  totals: Record<string, number>;
  total: number;
  page: number;
  pageSize: number;
  /** Options for the filter dropdowns. */
  cashiers: Array<{id: string; name: string}>;
};

const MAX_EXPORT_ROWS = 10_000;

function orderRef(o: {_id: unknown; orderNumber?: string | null}) {
  return o.orderNumber || `#${String(o._id).slice(-6).toUpperCase()}`;
}

function personName(o: any) {
  const name = [o.guestInfo?.firstName, o.guestInfo?.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return o.orderSource === 'in-store' ? 'Walk-in' : o.isGuest ? 'Guest' : 'Customer';
}

function statusAt(o: any, status: string): {at: Date | null; by: string | null} {
  const entry = [...(o.statusHistory ?? [])].reverse().find((e: any) => e.status === status);
  return {at: entry?.at ?? null, by: entry?.by?.name ?? null};
}

function minutesBetween(a: Date | null, b: Date | null) {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

function orderFilter(range: ResolvedRange, filters: DetailFilters, salesOnly = false) {
  const match: Record<string, unknown> = {createdAt: {$gte: range.from, $lt: range.to}};
  if (salesOnly) Object.assign(match, SALE_MATCH);
  if (filters.orderType) match.orderType = filters.orderType;
  if (filters.paymentMethod) match.paymentMethod = filters.paymentMethod;
  if (filters.status && !salesOnly) match.orderStatus = filters.status;
  if (filters.cashierId) {
    match.$and = [
      ...((match.$and as unknown[]) ?? []),
      {$or: [{'handledBy.id': filters.cashierId}, {'statusHistory.by.id': filters.cashierId}]}
    ];
  }
  return match;
}

async function itemsByOrder(orderIds: unknown[]) {
  const items = await OrderItemModel.find({orderId: {$in: orderIds}}, {orderId: 1, name: 1, quantity: 1, price: 1})
    .lean()
    .exec();
  const map = new Map<string, Array<{name: string; quantity: number; price: number}>>();
  for (const i of items as any[]) {
    const k = String(i.orderId);
    const list = map.get(k) ?? [];
    list.push({name: i.name ?? 'Item', quantity: i.quantity ?? 0, price: i.price ?? 0});
    map.set(k, list);
  }
  return map;
}

async function staffOptions() {
  const rows = await StaffActivityModel.aggregate([
    {$group: {_id: '$actorId', name: {$last: '$actorName'}}},
    {$sort: {name: 1}}
  ]).exec();
  return rows.filter(r => r._id).map(r => ({id: String(r._id), name: r.name ?? 'Staff'}));
}

type Paging = {page: number; pageSize: number; all?: boolean};

function window(p: Paging) {
  return p.all ? {skip: 0, limit: MAX_EXPORT_ROWS} : {skip: (p.page - 1) * p.pageSize, limit: p.pageSize};
}

/* ------------------------------------------------------------- Sales */

async function salesRows(range: ResolvedRange, filters: DetailFilters, paging: Paging) {
  const match = orderFilter(range, filters);
  const {skip, limit} = window(paging);
  const [orders, total, totalsAgg] = await Promise.all([
    OrderModel.find(match).sort({createdAt: -1}).skip(skip).limit(limit).lean().exec(),
    OrderModel.countDocuments(match).exec(),
    OrderModel.aggregate([
      {$match: match},
      {
        $group: {
          _id: null,
          total: {$sum: {$ifNull: ['$totalAmount', 0]}},
          delivery: {$sum: {$ifNull: ['$deliveryFee', 0]}},
          fees: {$sum: {$ifNull: ['$transactionFee', 0]}}
        }
      }
    ]).exec()
  ]);
  const items = await itemsByOrder(orders.map(o => o._id));
  const rows = orders.map((o: any) => {
    const lines = items.get(String(o._id)) ?? [];
    const subtotal = round2(lines.reduce((a, l) => a + l.price * l.quantity, 0));
    const delivery = o.deliveryFee ?? 0;
    return {
      date: new Date(o.createdAt).toISOString(),
      order: orderRef(o),
      customer: personName(o),
      type: ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
      source: SOURCE_LABELS[o.orderSource ?? 'online'] ?? o.orderSource,
      items: lines.map(l => `${l.name} ×${l.quantity}`).join(', '),
      subtotal,
      discount: round2(Math.max(0, subtotal + delivery - (o.totalAmount ?? 0))),
      delivery,
      fees: o.transactionFee ?? 0,
      total: o.totalAmount ?? 0,
      payment: o.paymentMethod ? PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod : '—',
      status: STATUS_LABELS[o.orderStatus] ?? o.orderStatus,
      handledBy: o.handledBy?.name ?? statusAt(o, 'confirmed').by ?? '—'
    };
  });
  const t = totalsAgg[0] ?? {};
  return {
    columns: [
      {key: 'date', label: 'Date / time', type: 'datetime'},
      {key: 'order', label: 'Order #'},
      {key: 'customer', label: 'Customer'},
      {key: 'type', label: 'Type'},
      {key: 'source', label: 'Source'},
      {key: 'items', label: 'Items'},
      {key: 'subtotal', label: 'Subtotal', type: 'money'},
      {key: 'discount', label: 'Discount', type: 'money'},
      {key: 'delivery', label: 'Delivery', type: 'money'},
      {key: 'fees', label: 'Fees', type: 'money'},
      {key: 'total', label: 'Total', type: 'money'},
      {key: 'payment', label: 'Payment'},
      {key: 'status', label: 'Status'},
      {key: 'handledBy', label: 'Handled by'}
    ] as DetailColumn[],
    rows,
    totals: {total: round2(t.total ?? 0), delivery: round2(t.delivery ?? 0), fees: round2(t.fees ?? 0)},
    total
  };
}

/* -------------------------------------------------------- Operations */

async function operationsRows(range: ResolvedRange, filters: DetailFilters, paging: Paging) {
  const match = orderFilter(range, filters);
  const {skip, limit} = window(paging);
  const [orders, total] = await Promise.all([
    OrderModel.find(match).sort({createdAt: -1}).skip(skip).limit(limit).lean().exec(),
    OrderModel.countDocuments(match).exec()
  ]);
  const rows = orders.map((o: any) => {
    const confirmed = statusAt(o, 'confirmed');
    const preparing = statusAt(o, 'preparing');
    const ready = statusAt(o, 'ready');
    const out = statusAt(o, 'on_the_way');
    const done = statusAt(o, 'completed');
    const cancelled = statusAt(o, 'cancelled');
    const readyAt = ready.at ?? out.at;
    const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
    return {
      placed: new Date(o.createdAt).toISOString(),
      order: orderRef(o),
      type: ORDER_TYPE_LABELS[o.orderType] ?? o.orderType,
      confirmed: iso(confirmed.at),
      confirmedBy: confirmed.by ?? '—',
      preparing: iso(preparing.at),
      ready: iso(readyAt),
      readyBy: ready.by ?? out.by ?? '—',
      completed: iso(done.at),
      completedBy: done.by ?? cancelled.by ?? '—',
      waitMin: minutesBetween(o.createdAt, confirmed.at),
      prepMin: minutesBetween(preparing.at ?? confirmed.at, readyAt),
      status: STATUS_LABELS[o.orderStatus] ?? o.orderStatus
    };
  });
  const prep = rows.map(r => r.prepMin).filter((n): n is number => typeof n === 'number');
  return {
    columns: [
      {key: 'placed', label: 'Placed', type: 'datetime'},
      {key: 'order', label: 'Order #'},
      {key: 'type', label: 'Type'},
      {key: 'confirmed', label: 'Confirmed', type: 'datetime'},
      {key: 'confirmedBy', label: 'Confirmed by'},
      {key: 'preparing', label: 'Preparing', type: 'datetime'},
      {key: 'ready', label: 'Ready / out', type: 'datetime'},
      {key: 'readyBy', label: 'Ready by'},
      {key: 'completed', label: 'Completed', type: 'datetime'},
      {key: 'completedBy', label: 'Finished by'},
      {key: 'waitMin', label: 'Wait to confirm (min)', type: 'number'},
      {key: 'prepMin', label: 'Prep (min)', type: 'number'},
      {key: 'status', label: 'Status'}
    ] as DetailColumn[],
    rows,
    totals: {prepMin: prep.length ? Math.round(prep.reduce((a, b) => a + b, 0) / prep.length) : 0},
    total
  };
}

/* ---------------------------------------------------------- Products */

async function productRows(range: ResolvedRange, filters: DetailFilters, paging: Paging) {
  const match = orderFilter(range, filters, true);
  const grouped = await OrderModel.aggregate([
    {$match: match},
    {$lookup: {from: 'order_items', localField: '_id', foreignField: 'orderId', as: 'items'}},
    {$unwind: '$items'},
    {
      $group: {
        _id: {
          day: {$dateToString: {format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Manila'}},
          product: {$ifNull: ['$items.name', 'Item']}
        },
        units: {$sum: '$items.quantity'},
        revenue: {$sum: {$multiply: ['$items.quantity', '$items.price']}},
        orders: {$addToSet: '$_id'}
      }
    },
    {$project: {units: 1, revenue: 1, orders: {$size: '$orders'}}},
    {$sort: {'_id.day': -1, revenue: -1}}
  ]).exec();
  const total = grouped.length;
  const {skip, limit} = window(paging);
  const rows = grouped.slice(skip, skip + limit).map(g => ({
    date: g._id.day,
    product: g._id.product,
    units: g.units,
    orders: g.orders,
    revenue: round2(g.revenue),
    avgPrice: g.units ? round2(g.revenue / g.units) : 0
  }));
  return {
    columns: [
      {key: 'date', label: 'Day', type: 'date'},
      {key: 'product', label: 'Product'},
      {key: 'units', label: 'Units sold', type: 'number'},
      {key: 'orders', label: 'Orders', type: 'number'},
      {key: 'revenue', label: 'Revenue (menu price)', type: 'money'},
      {key: 'avgPrice', label: 'Avg price', type: 'money'}
    ] as DetailColumn[],
    rows,
    totals: {
      units: grouped.reduce((a, g) => a + g.units, 0),
      revenue: round2(grouped.reduce((a, g) => a + g.revenue, 0))
    },
    total
  };
}

/* --------------------------------------------------------- Customers */

async function customerRows(range: ResolvedRange, filters: DetailFilters, paging: Paging) {
  const match = orderFilter(range, filters, true);
  const grouped = await OrderModel.aggregate([
    {$match: {...match, orderSource: {$ne: 'in-store'}}},
    {
      $group: {
        _id: {$ifNull: ['$customerId', {$ifNull: ['$guestInfo.phoneNumber', '$guestInfo.email']}]},
        isGuest: {$last: '$isGuest'},
        firstName: {$last: '$guestInfo.firstName'},
        lastName: {$last: '$guestInfo.lastName'},
        phone: {$last: '$guestInfo.phoneNumber'},
        email: {$last: '$guestInfo.email'},
        orders: {$sum: 1},
        spent: {$sum: {$ifNull: ['$totalAmount', 0]}},
        lastOrder: {$max: '$createdAt'}
      }
    },
    {$sort: {spent: -1}}
  ]).exec();
  const total = grouped.length;
  const {skip, limit} = window(paging);
  const page = grouped.slice(skip, skip + limit);
  const ids = page.filter(g => g._id instanceof mongoose.Types.ObjectId).map(g => g._id);
  const accounts = await CustomerModel.find({_id: {$in: ids}}, {email: 1, phoneNumber: 1, points: 1, firstName: 1, lastName: 1})
    .lean()
    .exec();
  const byId = new Map(accounts.map((a: any) => [String(a._id), a]));
  const rows = page.map(g => {
    const acct: any = byId.get(String(g._id));
    return {
      customer: acct
        ? [acct.firstName, acct.lastName].filter(Boolean).join(' ')
        : [g.firstName, g.lastName].filter(Boolean).join(' ') || 'Guest',
      kind: acct ? 'Account' : 'Guest',
      phone: acct?.phoneNumber ?? g.phone ?? '—',
      email: acct?.email ?? g.email ?? '—',
      orders: g.orders,
      spent: round2(g.spent),
      avgOrder: g.orders ? round2(g.spent / g.orders) : 0,
      lastOrder: g.lastOrder ? new Date(g.lastOrder).toISOString() : null,
      points: acct?.points ?? null
    };
  });
  return {
    columns: [
      {key: 'customer', label: 'Customer'},
      {key: 'kind', label: 'Account'},
      {key: 'phone', label: 'Phone'},
      {key: 'email', label: 'Email'},
      {key: 'orders', label: 'Orders', type: 'number'},
      {key: 'spent', label: 'Spent', type: 'money'},
      {key: 'avgOrder', label: 'Avg order', type: 'money'},
      {key: 'lastOrder', label: 'Last order', type: 'datetime'},
      {key: 'points', label: 'Points', type: 'number'}
    ] as DetailColumn[],
    rows,
    totals: {
      orders: grouped.reduce((a, g) => a + g.orders, 0),
      spent: round2(grouped.reduce((a, g) => a + g.spent, 0))
    },
    total
  };
}

/* ------------------------------------------------------------- Staff */

/** "Accepted order DC-012", "Marked order DC-012 as Preparing"... */
function describeAction(e: any, ref: string) {
  const order = ref ? `order ${ref}` : 'an order';
  switch (e.action) {
    case 'login':
      return 'Signed in';
    case 'logout':
      return 'Signed out';
    case 'courier_ack':
      return `Replied to the courier booking on ${order}`;
  }
  const status = e.meta?.status as string | undefined;
  const reason = e.meta?.reason ? ` (${e.meta.reason})` : '';
  switch (status) {
    case 'confirmed':
      return `Accepted ${order}`;
    case 'on_the_way':
      return `Sent out ${order} for delivery`;
    case 'completed':
      return `Completed ${order}`;
    case 'cancelled':
      return `Cancelled ${order}${reason}`;
    default:
      return `Marked ${order} as ${STATUS_LABELS[status ?? ''] ?? status ?? 'updated'}${reason}`;
  }
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Staff log: what each staff member did to orders. Sign-in / sign-out events
 * are not listed; the Status column shows whether the cashier is online now
 * (heartbeat from the cashier apps, see utils/presence).
 */
async function staffRows(range: ResolvedRange, filters: DetailFilters, paging: Paging) {
  const match: Record<string, unknown> = {
    at: {$gte: range.from, $lt: range.to},
    action: {$nin: ['login', 'logout']}
  };
  const and: Record<string, unknown>[] = [];
  if (filters.cashierId) match.actorId = filters.cashierId;
  const onlineIds = await cashierRepository.listOnlineIds();
  if (filters.presence === 'online') and.push({actorId: {$in: onlineIds}});
  if (filters.presence === 'offline') and.push({actorType: 'cashier', actorId: {$nin: onlineIds}});
  const search = filters.search?.trim();
  if (search) {
    const rx = {$regex: escapeRegex(search), $options: 'i'};
    const matchingOrders = await OrderModel.find({orderNumber: rx}, {_id: 1}).limit(500).lean().exec();
    and.push({$or: [{actorName: rx}, {orderId: {$in: matchingOrders.map(o => o._id)}}]});
  }
  if (and.length) match.$and = and;

  const {skip, limit} = window(paging);
  const [events, total, perStaff] = await Promise.all([
    StaffActivityModel.find(match).sort({at: -1}).skip(skip).limit(limit).lean().exec(),
    StaffActivityModel.countDocuments(match).exec(),
    StaffActivityModel.aggregate([
      {$match: {...match, action: 'order_status'}},
      {$group: {_id: null, orders: {$addToSet: '$orderId'}}},
      {$project: {orders: {$size: '$orders'}}}
    ]).exec()
  ]);
  const orderIds = events.map((e: any) => e.orderId).filter(Boolean);
  const orders = await OrderModel.find({_id: {$in: orderIds}}, {orderNumber: 1}).lean().exec();
  const refs = new Map(orders.map((o: any) => [String(o._id), orderRef(o)]));
  const online = new Set(onlineIds);
  const rows = events.map((e: any) => {
    const ref = e.orderId ? refs.get(String(e.orderId)) ?? `#${String(e.orderId).slice(-6).toUpperCase()}` : '';
    return {
      at: new Date(e.at).toISOString(),
      staff: e.actorName ?? 'Staff',
      role: e.actorType === 'admin' ? 'Owner' : 'Cashier',
      status: e.actorType === 'cashier' ? (online.has(e.actorId) ? 'Online' : 'Offline') : '—',
      action: describeAction(e, ref),
      device: e.client === 'mobile' ? 'Mobile app' : 'Web',
      ip: e.ip ?? '—'
    };
  });
  return {
    columns: [
      {key: 'at', label: 'Date / time', type: 'datetime'},
      {key: 'staff', label: 'Staff'},
      {key: 'role', label: 'Role'},
      {key: 'status', label: 'Status'},
      {key: 'action', label: 'Activity'},
      {key: 'device', label: 'Device'},
      {key: 'ip', label: 'IP'}
    ] as DetailColumn[],
    rows,
    totals: {ordersHandled: perStaff[0]?.orders ?? 0},
    total
  };
}

/* ------------------------------------------------------------ Public */

export async function getReportDetail(
  view: DetailView,
  range: ResolvedRange,
  filters: DetailFilters,
  paging: Paging
): Promise<DetailResult> {
  const build =
    view === 'sales'
      ? salesRows
      : view === 'operations'
        ? operationsRows
        : view === 'products'
          ? productRows
          : view === 'customers'
            ? customerRows
            : staffRows;
  const [result, cashiers] = await Promise.all([build(range, filters, paging), staffOptions()]);
  return {view, ...result, page: paging.page, pageSize: paging.pageSize, cashiers};
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function manilaDateTime(iso: string) {
  const d = new Date(iso);
  return `${toManilaDayKey(d)} ${d.toLocaleTimeString('en-PH', {timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit'})}`;
}

/** Same rows as the screen (all pages), as CSV with a totals line. */
export function detailToCsv(result: DetailResult) {
  const header = result.columns.map(c => csvCell(c.label)).join(',');
  const lines = result.rows.map(r =>
    result.columns
      .map(c => {
        const v = r[c.key];
        if (c.type === 'datetime' && typeof v === 'string') return csvCell(manilaDateTime(v));
        return csvCell(v);
      })
      .join(',')
  );
  const totalsLine = result.columns
    .map((c, i) => (i === 0 ? 'TOTAL' : c.key in result.totals ? csvCell(result.totals[c.key]) : ''))
    .join(',');
  return [header, ...lines, totalsLine].join('\r\n');
}
