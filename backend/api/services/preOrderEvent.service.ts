import mongoose from 'mongoose';
import {
  PreOrderEventModel,
  type PreOrderEventDocument,
  type PreOrderEventStatus
} from '../models/PreOrderEvent.model';
import {OrderModel, type OrderDocument} from '../models/Order.model';
import {OrderItemModel} from '../models/OrderItem.model';
import {ProductModel} from '../models/Product.model';
import {CustomerModel} from '../models/Customer.model';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {customerRepository} from '../repositories/customer.repository';
import {notificationRepository} from '../repositories/notification.repository';
import {notificationService} from './notification.service';
import {notifyOwners} from './ownerNotify.service';
import {ApiError} from '../utils/error';

/*
 * Dated pre-orders ("Holiday pre-orders").
 *
 * Owner: creates a pickup date, picks which lechon products are offered, sets
 * sizes (price, stock, max per order) and pickup slots (limit), then
 * publishes it. Customers (accounts only) order sizes for that date and choose
 * a slot + receive method. Each order is a normal Order (so confirmation call,
 * Xendit payment, statuses, tracking and reports all work) carrying the
 * pickup info in `order.preOrder`.
 *
 * Capacity: `remaining` counters on the date are decremented with conditional
 * updates (`remaining >= qty`) so two customers can never buy the last unit.
 * Every cancel/expiry path calls `releaseForOrder`, which gives capacity back
 * once (guarded by the `preOrder.released` latch).
 */

const MANILA_OFFSET_MS = 8 * 3600000;
const DAY_MS = 86400000;

export const DEFAULT_SLOTS: Array<{label: string; startTime: string}> = [
  {label: '8 - 9 AM', startTime: '08:00'},
  {label: '10 - 11 AM', startTime: '10:00'},
  {label: '12 - 1 PM', startTime: '12:00'},
  {label: '2 - 3 PM', startTime: '14:00'},
  {label: '4 - 5 PM', startTime: '16:00'},
  {label: '6 - 7 PM', startTime: '18:00'},
  {label: '8 PM', startTime: '20:00'}
];

// --- date helpers (Asia/Manila) ----------------------------------------------

/** "2026-12-24" -> Manila midnight of that day (as a UTC instant). */
export function parsePickupDate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Pickup date must be YYYY-MM-DD');
  }
  const date = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Pickup date is not a valid date');
  }
  return date;
}

export function pickupDateKey(date: Date): string {
  return new Date(date.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

function manilaTodayStart(now = new Date()): Date {
  return new Date(`${pickupDateKey(now)}T00:00:00+08:00`);
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getTime() + (h * 60 + m) * 60000);
}

export function formatPickup(date: Date, slotLabel?: string): string {
  const label = date.toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return slotLabel ? `${label}, ${slotLabel}` : label;
}

// --- input normalisation ------------------------------------------------------

type SizeInput = {
  _id?: string;
  label?: unknown;
  description?: unknown;
  price?: unknown;
  stock?: unknown;
  maxPerOrder?: unknown;
};
type ProductInput = {_id?: string; productId?: unknown; sizes?: SizeInput[]; maxSizes?: unknown};
type SlotInput = {_id?: string; label?: unknown; startTime?: unknown; limit?: unknown};

export type EventInput = {
  title?: unknown;
  pickupDate?: unknown;
  description?: unknown;
  cancelCutoffDays?: unknown;
  maxOrdersPerCustomer?: unknown;
  products?: ProductInput[];
  slots?: SlotInput[];
};

const isId = (v: unknown): v is string =>
  typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);

function wholeNumber(value: unknown, field: string, min = 0): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be a whole number of at least ${min}`);
  }
  return n;
}

function text(value: unknown, field: string, max: number, required = true): string | null {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) {
    if (required) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required`);
    return null;
  }
  if (s.length > max) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} must be at most ${max} characters`);
  }
  return s;
}

/**
 * Builds the products/slots arrays for create or update. On update, counters
 * keep what is already sold: remaining = newStock - sold, and stock can never
 * go below what has been ordered.
 */
async function buildContent(input: EventInput, existing?: PreOrderEventDocument) {
  const productInputs = Array.isArray(input.products) ? input.products : [];
  const slotInputs = Array.isArray(input.slots) ? input.slots : [];
  if (productInputs.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Add at least one product');
  }
  if (slotInputs.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Add at least one pickup time slot');
  }

  const productIds = productInputs.map(p => p.productId);
  if (!productIds.every(isId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Each product must be selected');
  }
  if (new Set(productIds as string[]).size !== productIds.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'A product is listed twice');
  }
  const found = await ProductModel.find({_id: {$in: productIds}}, {_id: 1}).lean();
  if (found.length !== productIds.length) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'One of the products no longer exists');
  }

  // Index existing sizes/slots so edits keep their sold counts.
  const oldSizes = new Map<string, {stock: number; remaining: number}>();
  for (const p of existing?.products ?? []) {
    for (const s of p.sizes) oldSizes.set(String(s._id), {stock: s.stock, remaining: s.remaining});
  }
  const oldSlots = new Map<string, {limit: number; remaining: number}>();
  for (const s of existing?.slots ?? []) oldSlots.set(String(s._id), {limit: s.limit, remaining: s.remaining});

  const keptSizeIds = new Set<string>();
  const products = productInputs.map((p, pi) => {
    const sizesIn = Array.isArray(p.sizes) ? p.sizes : [];
    if (sizesIn.length === 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', `Product #${pi + 1} needs at least one size`);
    }
    const sizes = sizesIn.map((s, si) => {
      const where = `Product #${pi + 1}, size #${si + 1}`;
      const label = text(s.label, `${where} label`, 120) as string;
      const description = text(s.description, `${where} description`, 200, false);
      const price = Number(s.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', `${where}: price must be more than 0`);
      }
      const stock = wholeNumber(s.stock, `${where} stock`, 0);
      const maxPerOrder = wholeNumber(s.maxPerOrder ?? 1, `${where} max per order`, 1);
      const old = s._id && isId(s._id) ? oldSizes.get(s._id) : undefined;
      const sold = old ? old.stock - old.remaining : 0;
      if (stock < sold) {
        throw new ApiError(
          409,
          'STOCK_BELOW_SOLD',
          `${where} "${label}": ${sold} already ordered, so stock cannot be lower than ${sold}`
        );
      }
      if (old) keptSizeIds.add(s._id as string);
      return {
        ...(old ? {_id: new mongoose.Types.ObjectId(s._id as string)} : {}),
        label,
        description,
        price: Math.round(price * 100) / 100,
        stock,
        remaining: stock - sold,
        maxPerOrder
      };
    });
    return {
      ...(p._id && isId(p._id) ? {_id: new mongoose.Types.ObjectId(p._id)} : {}),
      productId: new mongoose.Types.ObjectId(p.productId as string),
      sizes,
      maxSizes: wholeNumber(p.maxSizes ?? 1, `Product #${pi + 1} sizes per customer`, 1)
    };
  });

  // A size that already has orders cannot be deleted.
  for (const [id, s] of oldSizes) {
    if (!keptSizeIds.has(id) && s.stock - s.remaining > 0) {
      throw new ApiError(409, 'SIZE_HAS_ORDERS', 'A size that already has orders cannot be removed. Set its stock to what was ordered instead.');
    }
  }

  const keptSlotIds = new Set<string>();
  const slots = slotInputs.map((s, i) => {
    const where = `Time slot #${i + 1}`;
    const label = text(s.label, `${where} label`, 40) as string;
    const startTime = typeof s.startTime === 'string' ? s.startTime.trim() : '';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      throw new ApiError(400, 'VALIDATION_ERROR', `${where}: start time must be HH:MM`);
    }
    const limit = wholeNumber(s.limit, `${where} limit`, 0);
    const old = s._id && isId(s._id) ? oldSlots.get(s._id) : undefined;
    const used = old ? old.limit - old.remaining : 0;
    if (limit < used) {
      throw new ApiError(409, 'LIMIT_BELOW_USED', `${where} "${label}": ${used} pickups booked, so the limit cannot be lower than ${used}`);
    }
    if (old) keptSlotIds.add(s._id as string);
    return {
      ...(old ? {_id: new mongoose.Types.ObjectId(s._id as string)} : {}),
      label,
      startTime,
      limit,
      remaining: limit - used
    };
  });
  for (const [id, s] of oldSlots) {
    if (!keptSlotIds.has(id) && s.limit - s.remaining > 0) {
      throw new ApiError(409, 'SLOT_HAS_ORDERS', 'A time slot that already has bookings cannot be removed.');
    }
  }
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {products, slots};
}

// --- per-customer usage --------------------------------------------------------

/**
 * What one customer already holds on a date: their active (not cancelled)
 * orders and how many pieces of each size those orders contain. Limits are
 * per customer, so a second order cannot get around them.
 */
async function customerUsage(customerId: string, eventIds: Array<string | mongoose.Types.ObjectId>) {
  const orders = await OrderModel.find(
    {
      customerId: new mongoose.Types.ObjectId(customerId),
      'preOrder.eventId': {$in: eventIds.map(id => new mongoose.Types.ObjectId(String(id)))},
      orderStatus: {$ne: 'cancelled'}
    },
    {_id: 1, 'preOrder.eventId': 1}
  ).lean();
  const items = orders.length
    ? await OrderItemModel.find(
        {orderId: {$in: orders.map(o => o._id)}},
        {orderId: 1, preOrderSizeId: 1, quantity: 1}
      ).lean()
    : [];
  const eventByOrder = new Map(orders.map(o => [String(o._id), String(o.preOrder?.eventId)]));
  const usage = new Map<string, {orderIds: string[]; sizeQty: Record<string, number>}>();
  for (const id of eventIds) usage.set(String(id), {orderIds: [], sizeQty: {}});
  for (const o of orders) usage.get(String(o.preOrder?.eventId))?.orderIds.push(String(o._id));
  for (const it of items as any[]) {
    if (!it.preOrderSizeId) continue;
    const u = usage.get(eventByOrder.get(String(it.orderId)) ?? '');
    if (!u) continue;
    const key = String(it.preOrderSizeId);
    u.sizeQty[key] = (u.sizeQty[key] ?? 0) + it.quantity;
  }
  return usage;
}

/** Stops a double-tap from placing two orders before the first is saved. */
const placing = new Set<string>();

// --- shaping for the API ------------------------------------------------------

async function productInfo(ids: string[]) {
  const rows = await ProductModel.find(
    {_id: {$in: ids}},
    {name: 1, imageUrl: 1, category: 1, description: 1}
  ).lean();
  return new Map(rows.map(r => [String(r._id), r]));
}

function shapeEvent(event: PreOrderEventDocument, info: Map<string, any>, forOwner: boolean) {
  const products = event.products.map(p => {
    const prod = info.get(String(p.productId));
    return {
      _id: String(p._id),
      productId: String(p.productId),
      name: prod?.name ?? 'Removed product',
      imageUrl: prod?.imageUrl ?? null,
      category: prod?.category ?? null,
      description: prod?.description ?? null,
      maxSizes: p.maxSizes ?? 1,
      sizes: p.sizes.map(s => ({
        _id: String(s._id),
        label: s.label,
        description: s.description ?? null,
        price: s.price,
        maxPerOrder: s.maxPerOrder,
        remaining: s.remaining,
        soldOut: s.remaining <= 0,
        ...(forOwner ? {stock: s.stock, sold: s.stock - s.remaining} : {})
      }))
    };
  });
  const slots = event.slots.map(s => ({
    _id: String(s._id),
    label: s.label,
    startTime: s.startTime,
    remaining: s.remaining,
    full: s.remaining <= 0,
    ...(forOwner ? {limit: s.limit, booked: s.limit - s.remaining} : {})
  }));
  const allPrices = products.flatMap(p => p.sizes.map(s => s.price));
  return {
    _id: String(event._id),
    title: event.title,
    pickupDate: pickupDateKey(event.pickupDate),
    pickupDateLabel: formatPickup(event.pickupDate),
    status: event.status,
    description: event.description ?? null,
    cancelCutoffDays: event.cancelCutoffDays,
    maxOrdersPerCustomer: event.maxOrdersPerCustomer ?? 1,
    cancelDeadline: new Date(event.pickupDate.getTime() - event.cancelCutoffDays * DAY_MS).toISOString(),
    fromPrice: allPrices.length ? Math.min(...allPrices) : null,
    soldOut: products.every(p => p.sizes.every(s => s.soldOut)) || slots.every(s => s.full),
    products,
    slots,
    ...(forOwner ? {publishedAt: event.publishedAt ?? null, createdAt: event.createdAt} : {})
  };
}

async function shapeMany(events: PreOrderEventDocument[], forOwner: boolean) {
  const ids = [...new Set(events.flatMap(e => e.products.map(p => String(p.productId))))];
  const info = await productInfo(ids);
  return events.map(e => shapeEvent(e, info, forOwner));
}

// --- notifications ------------------------------------------------------------

async function announceToCustomers(event: PreOrderEventDocument) {
  try {
    const customers = await customerRepository.listAllIds();
    await notificationRepository.createManyForCustomers(
      customers.map(c => c._id),
      {
        type: 'pre_order',
        title: `Pre-order is open: ${event.title}`,
        message: `Reserve your lechon for pickup on ${formatPickup(event.pickupDate)}. Limited slots, order early!`,
        link: `/customer/dashboard/preorder/${String(event._id)}`
      }
    );
  } catch (error) {
    console.error('Failed to announce pre-order date', error);
  }
}

async function notifyStaffNewPreOrder(order: OrderDocument) {
  const code = String(order._id).slice(-6).toUpperCase();
  const message = `New pre-order #${code} for ${formatPickup(order.preOrder!.pickupDate, order.preOrder!.slotLabel)}.`;
  // Pre-orders are owner-only: cashiers are not notified.
  await notifyOwners({
    type: 'new_order',
    title: 'New pre-order',
    message,
    orderId: String(order._id),
    link: '/owner/dashboard?tab=preorders'
  });
}

// --- capacity -------------------------------------------------------------

async function takeSize(eventId: string, sizeId: string, qty: number) {
  const res = await PreOrderEventModel.updateOne(
    {_id: eventId},
    {$inc: {'products.$[].sizes.$[s].remaining': -qty}},
    {arrayFilters: [{'s._id': new mongoose.Types.ObjectId(sizeId), 's.remaining': {$gte: qty}}]}
  ).exec();
  return res.modifiedCount === 1;
}

async function giveSize(eventId: string, sizeId: string, qty: number) {
  await PreOrderEventModel.updateOne(
    {_id: eventId},
    {$inc: {'products.$[].sizes.$[s].remaining': qty}},
    {arrayFilters: [{'s._id': new mongoose.Types.ObjectId(sizeId)}]}
  ).exec();
}

async function takeSlot(eventId: string, slotId: string) {
  const res = await PreOrderEventModel.updateOne(
    {_id: eventId, slots: {$elemMatch: {_id: new mongoose.Types.ObjectId(slotId), remaining: {$gte: 1}}}},
    {$inc: {'slots.$.remaining': -1}}
  ).exec();
  return res.modifiedCount === 1;
}

async function giveSlot(eventId: string, slotId: string) {
  await PreOrderEventModel.updateOne(
    {_id: eventId, 'slots._id': new mongoose.Types.ObjectId(slotId)},
    {$inc: {'slots.$.remaining': 1}}
  ).exec();
}

// --- public API -----------------------------------------------------------------

export type PlacePreOrderInput = {
  items?: Array<{productId?: unknown; sizeId?: unknown; quantity?: unknown}>;
  slotId?: unknown;
  receiveMethod?: unknown;
  notes?: unknown;
};

export const preOrderEventService = {
  // ---------- owner ----------
  async listForOwner() {
    const events = await PreOrderEventModel.find({}).sort({pickupDate: 1}).exec();
    const shaped = await shapeMany(events, true);
    const counts = await OrderModel.aggregate([
      {$match: {isPreOrder: true, 'preOrder.eventId': {$in: events.map(e => e._id)}}},
      {
        $group: {
          _id: '$preOrder.eventId',
          orders: {$sum: {$cond: [{$ne: ['$orderStatus', 'cancelled']}, 1, 0]}},
          sales: {$sum: {$cond: [{$ne: ['$orderStatus', 'cancelled']}, '$totalAmount', 0]}}
        }
      }
    ]);
    const byId = new Map(counts.map(c => [String(c._id), c]));
    return shaped.map(e => ({
      ...e,
      orderCount: byId.get(e._id)?.orders ?? 0,
      orderValue: byId.get(e._id)?.sales ?? 0
    }));
  },

  async getForOwner(id: string) {
    const event = await this.findOrThrow(id);
    const [shaped] = await shapeMany([event], true);
    return shaped;
  },

  async findOrThrow(id: string) {
    if (!isId(id)) throw new ApiError(404, 'PREORDER_NOT_FOUND', 'Pre-order date not found');
    const event = await PreOrderEventModel.findById(id).exec();
    if (!event) throw new ApiError(404, 'PREORDER_NOT_FOUND', 'Pre-order date not found');
    return event;
  },

  async create(adminId: string, input: EventInput) {
    const title = text(input.title, 'Title', 80) as string;
    const pickupDate = parsePickupDate(input.pickupDate);
    if (pickupDate < manilaTodayStart()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Pickup date cannot be in the past');
    }
    const content = await buildContent(input);
    const event = await PreOrderEventModel.create({
      title,
      pickupDate,
      description: text(input.description, 'Description', 300, false),
      cancelCutoffDays: input.cancelCutoffDays === undefined ? 14 : wholeNumber(input.cancelCutoffDays, 'Cancel cut-off days', 0),
      maxOrdersPerCustomer:
        input.maxOrdersPerCustomer === undefined ? 1 : wholeNumber(input.maxOrdersPerCustomer, 'Orders per customer', 1),
      ...content,
      status: 'draft',
      createdBy: isId(adminId) ? new mongoose.Types.ObjectId(adminId) : null
    });
    return this.getForOwner(String(event._id));
  },

  async update(id: string, input: EventInput) {
    const event = await this.findOrThrow(id);
    const hasOrders = await OrderModel.exists({'preOrder.eventId': event._id, orderStatus: {$ne: 'cancelled'}});
    const pickupDate = input.pickupDate !== undefined ? parsePickupDate(input.pickupDate) : event.pickupDate;
    if (hasOrders && pickupDateKey(pickupDate) !== pickupDateKey(event.pickupDate)) {
      throw new ApiError(409, 'DATE_HAS_ORDERS', 'This date already has orders, so its pickup date cannot be changed. Create a new date instead.');
    }
    const content = await buildContent(input, event);
    event.title = (text(input.title ?? event.title, 'Title', 80) as string);
    event.pickupDate = pickupDate;
    event.description = text(input.description, 'Description', 300, false);
    if (input.cancelCutoffDays !== undefined) {
      event.cancelCutoffDays = wholeNumber(input.cancelCutoffDays, 'Cancel cut-off days', 0);
    }
    if (input.maxOrdersPerCustomer !== undefined) {
      event.maxOrdersPerCustomer = wholeNumber(input.maxOrdersPerCustomer, 'Orders per customer', 1);
    }
    event.set('products', content.products);
    event.set('slots', content.slots);
    await event.save();
    return this.getForOwner(id);
  },

  async setStatus(id: string, status: unknown) {
    if (status !== 'draft' && status !== 'published' && status !== 'closed') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Status must be draft, published or closed');
    }
    const event = await this.findOrThrow(id);
    const firstPublish = status === 'published' && !event.publishedAt;
    event.status = status as PreOrderEventStatus;
    if (firstPublish) event.publishedAt = new Date();
    await event.save();
    if (firstPublish) void announceToCustomers(event);
    return this.getForOwner(id);
  },

  async duplicate(id: string, input: {title?: unknown; pickupDate?: unknown}) {
    const source = await this.findOrThrow(id);
    const pickupDate = parsePickupDate(input.pickupDate);
    if (pickupDate < manilaTodayStart()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Pickup date cannot be in the past');
    }
    const copy = await PreOrderEventModel.create({
      title: text(input.title ?? `${source.title} (copy)`, 'Title', 80),
      pickupDate,
      description: source.description ?? null,
      cancelCutoffDays: source.cancelCutoffDays,
      maxOrdersPerCustomer: source.maxOrdersPerCustomer ?? 1,
      status: 'draft',
      products: source.products.map(p => ({
        productId: p.productId,
        maxSizes: p.maxSizes ?? 1,
        sizes: p.sizes.map(s => ({
          label: s.label,
          description: s.description ?? null,
          price: s.price,
          stock: s.stock,
          remaining: s.stock,
          maxPerOrder: s.maxPerOrder
        }))
      })),
      slots: source.slots.map(s => ({label: s.label, startTime: s.startTime, limit: s.limit, remaining: s.limit})),
      createdBy: source.createdBy ?? null
    });
    return this.getForOwner(String(copy._id));
  },

  async remove(id: string) {
    const event = await this.findOrThrow(id);
    const hasOrders = await OrderModel.exists({'preOrder.eventId': event._id});
    if (hasOrders) {
      throw new ApiError(409, 'DATE_HAS_ORDERS', 'This date has orders. Close it instead of deleting it.');
    }
    await event.deleteOne();
  },

  /** Orders of one date, with items, sizes and customer names (owner table). */
  async ordersForOwner(id: string) {
    const event = await this.findOrThrow(id);
    const orders = await OrderModel.find({'preOrder.eventId': event._id}).sort({'preOrder.pickupAt': 1, createdAt: 1}).lean();
    const ids = orders.map(o => String(o._id));
    const [items, customers] = await Promise.all([
      orderItemRepository.listByOrderIds(ids),
      CustomerModel.find(
        {_id: {$in: orders.map(o => o.customerId).filter(Boolean)}},
        {firstName: 1, lastName: 1, phoneNumber: 1}
      ).lean()
    ]);
    const customerById = new Map(customers.map(c => [String(c._id), c]));
    const itemsByOrder = new Map<string, any[]>();
    for (const it of items as any[]) {
      const key = String(it.orderId);
      const list = itemsByOrder.get(key) ?? [];
      list.push({
        name: it.productId?.name ?? 'Item',
        sizeLabel: it.sizeLabel ?? null,
        quantity: it.quantity,
        price: it.price
      });
      itemsByOrder.set(key, list);
    }
    return orders.map(o => {
      const c = o.customerId ? customerById.get(String(o.customerId)) : null;
      return {
        _id: String(o._id),
        code: `#${String(o._id).slice(-6).toUpperCase()}`,
        customerName: c ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() : 'Customer',
        customerPhone: (c as any)?.phoneNumber ?? null,
        slotLabel: o.preOrder?.slotLabel ?? '',
        receiveMethod: o.preOrder?.receiveMethod ?? 'pickup',
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus ?? 'unpaid',
        amountPaid: o.amountPaid ?? 0,
        totalAmount: o.totalAmount,
        notes: o.riderNotes ?? null,
        createdAt: o.createdAt,
        items: itemsByOrder.get(String(o._id)) ?? []
      };
    });
  },

  // ---------- customer / public ----------
  async listOpen(customerId?: string) {
    const events = await PreOrderEventModel.find({
      status: 'published',
      pickupDate: {$gte: manilaTodayStart()}
    })
      .sort({pickupDate: 1})
      .exec();
    const shaped = await shapeMany(events, false);
    if (!customerId || events.length === 0) return shaped;
    const usage = await customerUsage(customerId, events.map(e => e._id as mongoose.Types.ObjectId));
    return shaped.map(e => ({...e, mine: usage.get(e._id) ?? null}));
  },

  async getOpen(id: string, customerId?: string) {
    const event = await this.findOrThrow(id);
    if (event.status !== 'published' || event.pickupDate < manilaTodayStart()) {
      throw new ApiError(404, 'PREORDER_NOT_OPEN', 'This pre-order date is not open');
    }
    const [shaped] = await shapeMany([event], false);
    if (!customerId) return shaped;
    const usage = await customerUsage(customerId, [event._id as mongoose.Types.ObjectId]);
    return {...shaped, mine: usage.get(String(event._id)) ?? null};
  },

  async placeOrder(customerId: string, eventId: string, input: PlacePreOrderInput) {
    const key = `${customerId}:${eventId}`;
    if (placing.has(key)) {
      throw new ApiError(409, 'ORDER_IN_PROGRESS', 'Your pre-order is already being placed. Please wait a moment.');
    }
    placing.add(key);
    try {
      return await this.placeOrderUnlocked(customerId, eventId, input);
    } finally {
      placing.delete(key);
    }
  },

  async placeOrderUnlocked(customerId: string, eventId: string, input: PlacePreOrderInput) {
    const event = await this.findOrThrow(eventId);
    if (event.status !== 'published') {
      throw new ApiError(409, 'PREORDER_NOT_OPEN', 'This pre-order date is not accepting orders');
    }
    if (event.pickupDate <= manilaTodayStart()) {
      throw new ApiError(409, 'PREORDER_NOT_OPEN', 'Ordering for this date has ended');
    }

    const receiveMethod = input.receiveMethod;
    if (receiveMethod !== 'pickup' && receiveMethod !== 'lalamove') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Choose Self pick-up or Lalamove');
    }
    if (!isId(input.slotId)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Choose a pickup time');
    }
    const slot = event.slots.find(s => String(s._id) === input.slotId);
    if (!slot) throw new ApiError(400, 'VALIDATION_ERROR', 'That pickup time is no longer offered');

    // Merge duplicate lines and validate against the date's sizes.
    const merged = new Map<string, number>();
    for (const line of Array.isArray(input.items) ? input.items : []) {
      if (!isId(line.sizeId)) throw new ApiError(400, 'VALIDATION_ERROR', 'Choose a size for each item');
      const qty = Number(line.quantity ?? 1);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Quantity must be a whole number of at least 1');
      }
      merged.set(line.sizeId, (merged.get(line.sizeId) ?? 0) + qty);
    }
    if (merged.size === 0) throw new ApiError(400, 'VALIDATION_ERROR', 'Add at least one item');

    // Limits are per customer for the whole date, so count what they hold.
    const mine = (await customerUsage(customerId, [event._id as mongoose.Types.ObjectId])).get(eventId) ?? {
      orderIds: [] as string[],
      sizeQty: {} as Record<string, number>
    };
    const maxOrders = event.maxOrdersPerCustomer ?? 1;
    if (mine.orderIds.length >= maxOrders) {
      throw new ApiError(
        409,
        'ORDER_LIMIT_REACHED',
        maxOrders === 1
          ? 'You already have a pre-order for this date. Cancel it first if you want to change it.'
          : `You already have ${mine.orderIds.length} pre-orders for this date (the limit is ${maxOrders}).`
      );
    }

    const names = await productInfo(event.products.map(p => String(p.productId)));
    const lines = [...merged.entries()].map(([sizeId, quantity]) => {
      for (const p of event.products) {
        const size = p.sizes.find(s => String(s._id) === sizeId);
        if (size) {
          const already = mine.sizeQty[sizeId] ?? 0;
          if (already + quantity > size.maxPerOrder) {
            throw new ApiError(
              400,
              'MAX_PER_CUSTOMER',
              already > 0
                ? `You can have at most ${size.maxPerOrder} of "${size.label}" for this date (you already have ${already}).`
                : `You can order at most ${size.maxPerOrder} of "${size.label}"`
            );
          }
          return {productId: String(p.productId), productLineId: String(p._id), sizeId, quantity, size};
        }
      }
      throw new ApiError(400, 'VALIDATION_ERROR', 'A chosen size is no longer offered');
    });

    // Different sizes per product, counting sizes already ordered.
    for (const p of event.products) {
      const chosen = new Set<string>();
      for (const s of p.sizes) if ((mine.sizeQty[String(s._id)] ?? 0) > 0) chosen.add(String(s._id));
      for (const l of lines) if (l.productLineId === String(p._id)) chosen.add(l.sizeId);
      const maxSizes = p.maxSizes ?? 1;
      if (chosen.size > maxSizes) {
        const name = names.get(String(p.productId))?.name ?? 'this product';
        throw new ApiError(
          400,
          'MAX_SIZES',
          maxSizes === 1 ? `You can choose only one size of ${name}.` : `You can choose up to ${maxSizes} sizes of ${name}.`
        );
      }
    }

    // Reserve capacity; undo everything if any part fails.
    const taken: Array<{sizeId: string; quantity: number}> = [];
    let slotTaken = false;
    try {
      slotTaken = await takeSlot(eventId, String(slot._id));
      if (!slotTaken) {
        throw new ApiError(409, 'SLOT_FULL', `The ${slot.label} pickup time is full. Please choose another time.`);
      }
      for (const line of lines) {
        const ok = await takeSize(eventId, line.sizeId, line.quantity);
        if (!ok) {
          throw new ApiError(409, 'SIZE_SOLD_OUT', `"${line.size.label}" just sold out or has fewer left than you chose.`);
        }
        taken.push({sizeId: line.sizeId, quantity: line.quantity});
      }

      const total = Math.round(lines.reduce((sum, l) => sum + l.size.price * l.quantity, 0) * 100) / 100;
      const pickupAt = atTime(event.pickupDate, slot.startTime);
      const cancelDeadline = new Date(event.pickupDate.getTime() - event.cancelCutoffDays * DAY_MS);
      const notes = typeof input.notes === 'string' && input.notes.trim() ? input.notes.trim().slice(0, 300) : undefined;

      const order = await orderRepository.create({
        customerId: new mongoose.Types.ObjectId(customerId),
        isGuest: false,
        orderType: receiveMethod === 'pickup' ? 'pickup' : 'delivery',
        deliveryMode: 'LALAMOVE',
        orderSource: 'online',
        totalAmount: total,
        deliveryFee: 0,
        riderNotes: notes,
        orderStatus: 'pending',
        statusHistory: [{status: 'pending', at: new Date()}],
        // Due at the chosen slot, not "now + prep time".
        estimatedPrepMinutes: null,
        estimatedReadyAt: pickupAt,
        isOnline: true,
        // Capacity lives on the date: never touch regular product stock.
        stockDeducted: true,
        isPreOrder: true,
        preOrder: {
          eventId: event._id as mongoose.Types.ObjectId,
          eventTitle: event.title,
          pickupDate: event.pickupDate,
          slotId: slot._id,
          slotLabel: slot.label,
          pickupAt,
          receiveMethod,
          cancelDeadline,
          released: false
        }
      } as any);

      try {
        await OrderItemModel.insertMany(
          lines.map(l => ({
            orderId: order._id,
            productId: new mongoose.Types.ObjectId(l.productId),
            quantity: l.quantity,
            price: l.size.price,
            prepTimeMinutes: null,
            preOrderSizeId: new mongoose.Types.ObjectId(l.sizeId),
            sizeLabel: l.size.label
          }))
        );
        await transactionRepository.create({
          cashierId: null,
          orderId: order._id as any,
          paymentMethod: 'other',
          totalAmount: total,
          isOnline: true
        });
      } catch (error) {
        await OrderItemModel.deleteMany({orderId: order._id}).catch(() => undefined);
        await OrderModel.deleteOne({_id: order._id}).catch(() => undefined);
        throw error;
      }

      void notifyStaffNewPreOrder(order);
      return order;
    } catch (error) {
      for (const t of taken) await giveSize(eventId, t.sizeId, t.quantity).catch(() => undefined);
      if (slotTaken) await giveSlot(eventId, String(slot._id)).catch(() => undefined);
      throw error;
    }
  },

  /**
   * Gives a cancelled/expired pre-order's capacity back to its date, exactly
   * once (the `preOrder.released` latch). Safe to call from every cancel path.
   */
  async releaseForOrder(order: Pick<OrderDocument, '_id' | 'isPreOrder' | 'preOrder'>) {
    if (!order.isPreOrder || !order.preOrder) return;
    const claim = await OrderModel.updateOne(
      {_id: order._id, 'preOrder.released': false},
      {$set: {'preOrder.released': true}}
    ).exec();
    if (claim.modifiedCount !== 1) return;
    const eventId = String(order.preOrder.eventId);
    try {
      const items = await OrderItemModel.find({orderId: order._id}, {preOrderSizeId: 1, quantity: 1}).lean();
      for (const it of items) {
        if (it.preOrderSizeId) await giveSize(eventId, String(it.preOrderSizeId), it.quantity);
      }
      await giveSlot(eventId, String(order.preOrder.slotId));
    } catch (error) {
      console.error(`[preorder] failed to release capacity for order ${String(order._id)}`, error);
    }
  },

  /** Customer-side cancel rule for pre-orders. */
  assertCustomerCanCancel(order: OrderDocument, now = new Date()) {
    if (!order.isPreOrder || !order.preOrder) return;
    if (order.orderStatus === 'completed' || order.orderStatus === 'cancelled') {
      throw new ApiError(400, 'INVALID_OPERATION', 'Order can no longer be cancelled');
    }
    if (now > new Date(order.preOrder.cancelDeadline)) {
      throw new ApiError(
        400,
        'CANCEL_WINDOW_CLOSED',
        `Pre-orders can only be cancelled until ${formatPickup(new Date(order.preOrder.cancelDeadline))}. Please contact the store.`
      );
    }
  }
};
