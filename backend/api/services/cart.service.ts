import {ApiError} from '../utils/error';
import {cartRepository} from '../repositories/cart.repository';
import {productRepository} from '../repositories/product.repository';
import {isPreOrderClosed} from '../config/preOrder';

/**
 * Pre-order guards shared by the cart and both order-creation paths.
 *
 * These are the authoritative checks. The UI mirrors them for a friendly
 * message, but nothing is trusted from the client.
 */

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
}): Promise<void> {
  const product = await productRepository.findById(input.productId);
  if (!product || product.isPreOrder !== true) {
    return;
  }

  if (isPreOrderClosed(product.preOrderDeadline)) {
    throw new ApiError(
      400,
      'PRE_ORDER_CLOSED',
      `Pre-orders for "${product.name}" have closed. Please pick another item.`
    );
  }

  const limit = product.preOrderPurchaseLimit;
  if (typeof limit === 'number' && limit > 0 && input.requestedTotal > limit) {
    throw new ApiError(
      400,
      'PRE_ORDER_LIMIT_EXCEEDED',
      `"${product.name}" is limited to ${limit} per customer. You can order up to ${limit}.`
    );
  }
}

/**
 * Order-time check for every item in a payload at once.
 *
 * Used by both order-creation paths so a stale cart cannot slip a pre-order
 * past the limit or past a deadline that passed since it was added.
 *
 * @param allowPreOrder false for guests, who may never order these.
 */
export async function assertPreOrderItemsOrderable(input: {
  items: Array<{productId: string; quantity: number}>;
  allowPreOrder: boolean;
}): Promise<void> {
  const items = input.items ?? [];
  if (items.length === 0) return;

  const productIds = items.map(i => i.productId);
  const products = await productRepository.findManyByIds(productIds);
  const byId = new Map(
    products.map(p => [String(p._id), p as (typeof products)[number]])
  );

  for (const item of items) {
    const product: any = byId.get(String(item.productId));
    if (!product || product.isPreOrder !== true) continue;

    if (!input.allowPreOrder) {
      throw new ApiError(
        400,
        'PRE_ORDER_REQUIRES_ACCOUNT',
        `"${product.name}" is a pre-order item and requires a signed-in account. Please sign in to order it.`
      );
    }

    if (isPreOrderClosed(product.preOrderDeadline)) {
      throw new ApiError(
        400,
        'PRE_ORDER_CLOSED',
        `Pre-orders for "${product.name}" have closed. Please remove it from your cart to continue.`
      );
    }

    const limit = product.preOrderPurchaseLimit;
    if (typeof limit === 'number' && limit > 0 && item.quantity > limit) {
      throw new ApiError(
        400,
        'PRE_ORDER_LIMIT_EXCEEDED',
        `"${product.name}" is limited to ${limit} per customer. Please reduce the quantity in your cart.`
      );
    }
  }
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
    const quantity = Math.max(1, item.quantity);
    const cart = await cartRepository.findOrCreateByCustomerId(customerId);

    const existing = cart.items.find(
      i => i.productId.toString() === item.productId
    );

    // The limit applies to the quantity the cart ENDS UP at.
    if (existing) {
      await assertPreOrderOrderable({
        productId: item.productId,
        requestedTotal: existing.quantity + quantity
      });
    } else {
      await assertPreOrderOrderable({
        productId: item.productId,
        requestedTotal: quantity
      });
    }

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

    const safeQty = Math.max(1, quantity);

    await assertPreOrderOrderable({
      productId,
      requestedTotal: safeQty
    });

    item.quantity = safeQty;
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