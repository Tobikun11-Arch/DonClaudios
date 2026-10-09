import type {ClientSession} from 'mongoose';
import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {
  formatBatchTime,
  getPreOrderState,
  isPreOrderClosed,
  preOrderDayWindow
} from '../config/preOrder';

/**
 * Pre-order rules shared by the menu, the cart and the order-creation paths.
 *
 * The purchase limit is per CUSTOMER, per PRODUCT, per PRE-ORDER DAY: every
 * batch of the same day shares one allowance, and the allowance resets when
 * the product's deadline moves to another day. The backend is the only
 * authority — the menu payload carries `preOrderRemainingAllowance` so the UI
 * can disable add-to-cart without trusting the client.
 */

export type PreOrderProductLike = {
  _id?: unknown;
  name?: string | null;
  isPreOrder?: boolean | null;
  preOrderPurchaseLimit?: number | null;
  preOrderDeadline?: Date | string | null;
  preOrderBatches?: Array<{
    startTime: string;
    endTime: string;
    stock: number;
    sold?: number | null;
  }> | null;
};

/** A whole number >= 1. Rejects 1.5, 0, negatives and non-numbers. */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function toPlain(value: unknown): Record<string, any> {
  if (value && typeof (value as any).toObject === 'function') {
    return (value as any).toObject();
  }
  return (value ?? {}) as Record<string, any>;
}

/**
 * Units this customer has already committed to each product on its pre-order
 * day. Counts every non-cancelled order (pending AND confirmed); a cancelled
 * order frees the allowance. The comparison uses each ORDER's own creation
 * time against the product's day window, so an order placed at 11:59 PM store
 * time counts toward the right day even if it is read hours later.
 */
export async function orderedTodayByProduct(
  customerId: string | undefined,
  products: PreOrderProductLike[],
  session?: ClientSession
): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!customerId || products.length === 0) return totals;

  const windows = new Map<string, {from: Date; to: Date}>();
  let minFrom: number | null = null;
  let maxTo: number | null = null;

  for (const product of products) {
    if (product._id == null) continue;
    const window = preOrderDayWindow(product.preOrderDeadline);
    if (!window) continue;
    windows.set(String(product._id), window);
    minFrom =
      minFrom === null ? window.from.getTime() : Math.min(minFrom, window.from.getTime());
    maxTo = maxTo === null ? window.to.getTime() : Math.max(maxTo, window.to.getTime());
  }

  if (windows.size === 0 || minFrom === null || maxTo === null) return totals;

  const orders = await orderRepository.listPaginated(
    {
      customerId,
      orderStatus: {$ne: 'cancelled'},
      createdAt: {$gte: new Date(minFrom), $lt: new Date(maxTo)}
    },
    0,
    0,
    session
  );
  if (orders.length === 0) return totals;

  const orderById = new Map<string, any>(
    orders.map(order => [String((order as any)._id), order])
  );
  const items = await orderItemRepository.listLeanByOrderIds(
    orders.map(order => String((order as any)._id)),
    session
  );

  for (const item of items as Array<Record<string, any>>) {
    const productId = String(item.productId);
    const window = windows.get(productId);
    if (!window) continue;

    const order = orderById.get(String(item.orderId));
    if (!order) continue;

    const createdAt = new Date(order.createdAt).getTime();
    if (Number.isNaN(createdAt)) continue;
    if (createdAt < window.from.getTime() || createdAt >= window.to.getTime()) {
      continue;
    }

    const quantity = Number(item.quantity) || 0;
    totals.set(productId, (totals.get(productId) ?? 0) + quantity);
  }

  return totals;
}

/** How many more this customer may still buy today, or null when unlimited. */
export function remainingAllowance(
  limit: number | null | undefined,
  orderedToday: number
): number | null {
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
    return null;
  }
  return Math.max(0, limit - orderedToday);
}

/** Throw when `requestedTotal` would push the customer past the owner's limit. */
export function assertWithinLimit(
  product: PreOrderProductLike,
  orderedToday: number,
  requestedTotal: number
): void {
  const limit = product.preOrderPurchaseLimit;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1) {
    return;
  }

  const remaining = Math.max(0, limit - orderedToday);
  if (requestedTotal <= remaining) return;

  const name = product.name ?? 'This item';
  throw new ApiError(
    400,
    'PRE_ORDER_LIMIT_EXCEEDED',
    remaining === 0
      ? `"${name}" is limited to ${limit} per customer, and you have already ordered the maximum for today.`
      : `"${name}" is limited to ${limit} per customer. You can order ${remaining} more for today.`
  );
}

/**
 * Adds `preOrderOrderedToday` and `preOrderRemainingAllowance` to pre-order
 * products so the UI can show the customer their own remaining allowance.
 * Returns plain objects (safe to JSON-serialise) with the populated
 * `createdBy` preserved.
 */
export async function attachPreOrderAllowance<T extends PreOrderProductLike>(
  products: T[],
  customerId?: string
): Promise<Array<Record<string, any>>> {
  const plain = products.map(product => toPlain(product));
  const preOrders = plain.filter(product => product.isPreOrder === true);
  if (preOrders.length === 0) return plain;

  const ordered = await orderedTodayByProduct(customerId, preOrders);

  for (const product of plain) {
    if (product.isPreOrder !== true) continue;
    const used = customerId ? ordered.get(String(product._id)) ?? 0 : 0;
    product.preOrderOrderedToday = customerId ? used : null;
    product.preOrderRemainingAllowance = remainingAllowance(
      product.preOrderPurchaseLimit,
      used
    );
  }

  return plain;
}

/**
 * Authoritative stock reservation for an online order, run inside the order
 * transaction.
 *
 * Pre-order items: validates the day window, the per-customer allowance and
 * the live batch's stock, then atomically removes the quantity from the batch
 * and the product total. Regular items: atomically removes the quantity from
 * `product.stock`. Because every reservation writes a product document, two
 * concurrent checkouts that touch the same product conflict and one retries,
 * so neither the allowance nor the stock can be exceeded.
 *
 * Returns a map of productId -> the batch startTime the units came from (or
 * null for legacy / non-pre-order items), used to stamp the order items so a
 * later cancel restores the same pool.
 */
export async function reserveOrderStock(input: {
  items: Array<{productId: string; quantity: number}>;
  customerId?: string;
  session: ClientSession;
}): Promise<Map<string, string | null>> {
  const {items, customerId, session} = input;
  const stamps = new Map<string, string | null>();

  const quantityByProduct = new Map<string, number>();
  for (const item of items) {
    if (!isPositiveInteger(item.quantity)) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Quantity must be a whole number greater than zero.'
      );
    }
    quantityByProduct.set(
      item.productId,
      (quantityByProduct.get(item.productId) ?? 0) + item.quantity
    );
  }

  const productIds = [...quantityByProduct.keys()];
  const products = await productRepository.findManyByIds(productIds, session);
  const byId = new Map(products.map(product => [String(product._id), product]));
  const orderedToday = await orderedTodayByProduct(
    customerId,
    products as PreOrderProductLike[],
    session
  );
  const now = new Date();

  for (const [productId, quantity] of quantityByProduct) {
    const product = byId.get(productId);
    if (!product) {
      throw new ApiError(
        404,
        'PRODUCT_NOT_FOUND',
        'A product in this order no longer exists.'
      );
    }

    // Regular product: reserve straight from the product total.
    if (product.isPreOrder !== true) {
      const updated = await productRepository.decrementStock(
        productId,
        quantity,
        session
      );
      if (!updated) {
        throw new ApiError(
          400,
          'INSUFFICIENT_STOCK',
          `Not enough stock for "${product.name}".`
        );
      }
      stamps.set(productId, null);
      continue;
    }

    const state = getPreOrderState(product);
    const name = product.name ?? 'This item';

    // Legacy pre-order (saved before batches existed): all-day window.
    if (!state.hasBatches) {
      if (isPreOrderClosed(product.preOrderDeadline, now)) {
        throw new ApiError(
          400,
          'PRE_ORDER_CLOSED',
          `Pre-orders for "${name}" have closed. Please pick another item.`
        );
      }

      assertWithinLimit(
        product as PreOrderProductLike,
        orderedToday.get(productId) ?? 0,
        quantity
      );

      const updated = await productRepository.decrementStock(
        productId,
        quantity,
        session
      );
      if (!updated) {
        throw new ApiError(
          400,
          'INSUFFICIENT_STOCK',
          `Not enough stock for "${name}".`
        );
      }
      stamps.set(productId, null);
      continue;
    }

    if (!state.orderable) {
      if (state.allDone) {
        throw new ApiError(
          400,
          'PRE_ORDER_CLOSED',
          `Pre-orders for "${name}" have closed for today. Please pick another item.`
        );
      }
      const next = state.nextBatch;
      throw new ApiError(
        400,
        'PRE_ORDER_NOT_LIVE',
        `"${name}" can only be ordered during its batch window${
          next
            ? ` — the next batch runs ${formatBatchTime(next.startTime)}–${formatBatchTime(next.endTime)}`
            : ''
        }. Please try again then.`
      );
    }

    const live = state.liveBatch as NonNullable<typeof state.liveBatch>;
    if (quantity > live.remaining) {
      throw new ApiError(
        400,
        'INSUFFICIENT_STOCK',
        live.remaining === 0
          ? `The current batch of "${name}" (${formatBatchTime(live.startTime)}–${formatBatchTime(live.endTime)}) is sold out.`
          : `Only ${live.remaining} left in the current batch of "${name}" (${formatBatchTime(live.startTime)}–${formatBatchTime(live.endTime)}).`
      );
    }

    assertWithinLimit(
      product as PreOrderProductLike,
      orderedToday.get(productId) ?? 0,
      quantity
    );

    const updated = await productRepository.reserveBatchStock(
      productId,
      live.startTime,
      quantity,
      live.stock - quantity,
      session
    );
    if (!updated) {
      throw new ApiError(
        400,
        'INSUFFICIENT_STOCK',
        `The current batch of "${name}" just sold out. Please try again.`
      );
    }

    stamps.set(productId, live.startTime);
  }

  return stamps;
}
