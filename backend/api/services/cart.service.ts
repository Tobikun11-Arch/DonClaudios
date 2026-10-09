import {ApiError} from '../utils/error';
import {cartRepository} from '../repositories/cart.repository';
import {productRepository} from '../repositories/product.repository';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {
  formatBatchTime,
  getPreOrderState,
  isPreOrderClosed,
  type PreOrderBatchState
} from '../config/preOrder';
import {
  assertWithinLimit,
  isPositiveInteger,
  orderedTodayByProduct,
  type PreOrderProductLike
} from './preOrder.service';

/**
 * Pre-order guards shared by the cart and the guest order-creation path.
 *
 * These are the authoritative checks. The UI mirrors them for a friendly
 * message, but nothing is trusted from the client.
 */

/**
 * Every non-cancelled order created inside the batch's window, plus its items.
 * Used to account for legacy pending orders that reserved no stock (they only
 * hold stock once confirmed), so the batch cannot over-accept.
 */
async function batchWindowUsage(batch: PreOrderBatchState): Promise<{
  orders: Array<any>;
  items: Array<any>;
}> {
  if (!batch.start || !batch.end) return {orders: [], items: []};

  const orders = await orderRepository.listPaginated(
    {
      orderStatus: {$ne: 'cancelled'},
      createdAt: {$gte: batch.start, $lt: batch.end}
    },
    0,
    0
  );
  if (orders.length === 0) return {orders: [], items: []};

  const items = await orderItemRepository.listByOrderIds(
    orders.map(o => String(o._id))
  );
  return {orders, items};
}

/**
 * Batch-aware pre-order assertion for one product.
 *
 * Batch products may only be ordered while a batch window is live, and the
 * per-customer limit applies to the whole pre-order DAY (all batches share it).
 */
async function assertPreOrderProductOrderable(input: {
  product: any;
  customerId?: string;
  requestedTotal: number;
}): Promise<void> {
  const product = input.product;
  const state = getPreOrderState(product);

  // Legacy pre-order (saved before batches existed): all-day window.
  if (!state.hasBatches) {
    if (isPreOrderClosed(product.preOrderDeadline)) {
      throw new ApiError(
        400,
        'PRE_ORDER_CLOSED',
        `Pre-orders for "${product.name}" have closed. Please pick another item.`
      );
    }
    if (input.customerId) {
      const ordered = await orderedTodayByProduct(input.customerId, [product]);
      assertWithinLimit(
        product as PreOrderProductLike,
        ordered.get(String(product._id)) ?? 0,
        input.requestedTotal
      );
    }
    return;
  }

  if (!state.orderable) {
    if (state.allDone) {
      throw new ApiError(
        400,
        'PRE_ORDER_CLOSED',
        `Pre-orders for "${product.name}" have closed for today. Please pick another item.`
      );
    }
    const next = state.nextBatch;
    throw new ApiError(
      400,
      'PRE_ORDER_NOT_LIVE',
      `"${product.name}" can only be ordered during its batch window${
        next
          ? ` — the next batch runs ${formatBatchTime(next.startTime)}–${formatBatchTime(next.endTime)}`
          : ''
      }. Please try again then.`
    );
  }

  const live = state.liveBatch as PreOrderBatchState;
  const usage = await batchWindowUsage(live);
  const orderByItemId = new Map(usage.orders.map(o => [String(o._id), o]));

  // Legacy pending orders (stockDeducted === false) have not touched the pool
  // yet, so subtract them; new orders already reserved at placement and are
  // reflected in `live.sold`.
  const pendingQty = usage.items
    .filter(item => String(item.productId) === String(product._id))
    .reduce((sum, item) => {
      const order = orderByItemId.get(String(item.orderId));
      return order && order.stockDeducted === false
        ? sum + item.quantity
        : sum;
    }, 0);
  const effectiveRemaining = Math.max(0, live.stock - live.sold - pendingQty);

  if (input.requestedTotal > effectiveRemaining) {
    throw new ApiError(
      400,
      'INSUFFICIENT_STOCK',
      effectiveRemaining === 0
        ? `The current batch of "${product.name}" (${formatBatchTime(live.startTime)}–${formatBatchTime(live.endTime)}) is sold out.`
        : `Only ${effectiveRemaining} left in the current batch of "${product.name}" (${formatBatchTime(live.startTime)}–${formatBatchTime(live.endTime)}).`
    );
  }

  if (input.customerId) {
    const ordered = await orderedTodayByProduct(input.customerId, [product]);
    assertWithinLimit(
      product as PreOrderProductLike,
      ordered.get(String(product._id)) ?? 0,
      input.requestedTotal
    );
  }
}

/**
 * Rejects the cart change when the product is a pre-order that the customer
 * can no longer order, or when the requested quantity breaks the owner's
 * purchase limit.
 *
 * `requestedTotal` is the quantity the cart would end up at, not the
 * increment, so the limit is checked against the final quantity.
 */
export async function assertPreOrderOrderable(input: {
  productId: string;
  requestedTotal: number;
  customerId?: string;
}): Promise<void> {
  const product = await productRepository.findById(input.productId);
  if (!product || product.isPreOrder !== true) {
    return;
  }

  await assertPreOrderProductOrderable({
    product,
    customerId: input.customerId,
    requestedTotal: input.requestedTotal
  });
}

/**
 * Order-time check for every item in a payload at once.
 *
 * Used by the guest order-creation path so a stale cart cannot slip a
 * pre-order past the account requirement, and by counter flows if ever called.
 *
 * @param allowPreOrder false for guests, who may never order these.
 */
export async function assertPreOrderItemsOrderable(input: {
  items: Array<{productId: string; quantity: number}>;
  allowPreOrder: boolean;
  customerId?: string;
}): Promise<Array<{productId: string; quantity: number; preOrderBatchStart?: string | null}>> {
  const items = input.items ?? [];
  if (items.length === 0) return [];

  const productIds = items.map(i => i.productId);
  const products = await productRepository.findManyByIds(productIds);
  const byId = new Map(
    products.map(p => [String(p._id), p as (typeof products)[number]])
  );

  const stamps: Array<{
    productId: string;
    quantity: number;
    preOrderBatchStart?: string | null;
  }> = [];

  for (const item of items) {
    const product: any = byId.get(String(item.productId));
    if (!product || product.isPreOrder !== true) {
      stamps.push({...item});
      continue;
    }

    if (!input.allowPreOrder) {
      throw new ApiError(
        400,
        'PRE_ORDER_REQUIRES_ACCOUNT',
        `"${product.name}" is a pre-order item and requires a signed-in account. Please sign in to order it.`
      );
    }

    await assertPreOrderProductOrderable({
      product,
      customerId: input.customerId,
      requestedTotal: item.quantity
    });

    // Remember which batch this was bought in so a cancel restores the
    // stock to the right pool.
    const state = getPreOrderState(product);
    stamps.push({
      ...item,
      preOrderBatchStart: state.liveBatch?.startTime ?? null
    });
  }

  return stamps;
}

export const cartService = {
  async getCart(customerId: string) {
    return cartRepository.findOrCreateByCustomerId(customerId);
  },

  async addItem(
    customerId: string,
    item: {
      productId: string;
      name: string;
      price: number;
      quantity: number;
      imageUrl?: string;
      instructions?: string;
    }
  ) {
    if (!isPositiveInteger(item.quantity)) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Quantity must be a whole number greater than zero.'
      );
    }
    const quantity = item.quantity;
    const cart = await cartRepository.findOrCreateByCustomerId(customerId);

    const existing = cart.items.find(
      i => i.productId.toString() === item.productId
    );

    // The limit applies to the quantity the cart ENDS UP at.
    await assertPreOrderOrderable({
      productId: item.productId,
      requestedTotal: (existing?.quantity ?? 0) + quantity,
      customerId
    });

    if (existing) {
      existing.quantity += quantity;
      existing.name = item.name;
      existing.price = item.price;
      existing.imageUrl = item.imageUrl;
      existing.instructions = item.instructions;
    } else {
      cart.items.push({
        productId: item.productId as any,
        name: item.name,
        price: item.price,
        quantity,
        imageUrl: item.imageUrl,
        instructions: item.instructions
      });
    }

    await cartRepository.save(cart);
    return cart;
  },

  async setQuantity(customerId: string, productId: string, quantity: number) {
    const cart = await cartRepository.findOrCreateByCustomerId(customerId);
    const item = cart.items.find(i => i.productId.toString() === productId);
    if (!item) {
      throw new ApiError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
    }

    if (!isPositiveInteger(quantity)) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Quantity must be a whole number greater than zero.'
      );
    }

    await assertPreOrderOrderable({
      productId,
      requestedTotal: quantity,
      customerId
    });

    item.quantity = quantity;
    await cartRepository.save(cart);
    return cart;
  },

  async removeItem(customerId: string, productId: string) {
    const cart = await cartRepository.findOrCreateByCustomerId(customerId);
    cart.items = cart.items.filter(i => i.productId.toString() !== productId);
    await cartRepository.save(cart);
    return cart;
  },

  async clear(customerId: string) {
    const cart = await cartRepository.findOrCreateByCustomerId(customerId);
    cart.items = [];
    await cartRepository.save(cart);
    return cart;
  }
};
