import {ApiError} from '../utils/error';
import {cartRepository} from '../repositories/cart.repository';

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
    }
  ) {
    const quantity = Math.max(1, item.quantity);
    const cart = await cartRepository.findOrCreateByCustomerId(customerId);

    const existing = cart.items.find(
      i => i.productId.toString() === item.productId
    );

    if (existing) {
      existing.quantity += quantity;
      existing.name = item.name;
      existing.price = item.price;
      existing.imageUrl = item.imageUrl;
    } else {
      cart.items.push({
        productId: item.productId as any,
        name: item.name,
        price: item.price,
        quantity,
        imageUrl: item.imageUrl
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

    item.quantity = Math.max(1, quantity);
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
