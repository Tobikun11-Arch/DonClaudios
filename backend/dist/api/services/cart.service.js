"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartService = void 0;
const error_1 = require("../utils/error");
const cart_repository_1 = require("../repositories/cart.repository");
exports.cartService = {
    async getCart(customerId) {
        return cart_repository_1.cartRepository.findOrCreateByCustomerId(customerId);
    },
    async addItem(customerId, item) {
        const quantity = Math.max(1, item.quantity);
        const cart = await cart_repository_1.cartRepository.findOrCreateByCustomerId(customerId);
        const existing = cart.items.find(i => i.productId.toString() === item.productId);
        if (existing) {
            existing.quantity += quantity;
            existing.name = item.name;
            existing.price = item.price;
            existing.imageUrl = item.imageUrl;
        }
        else {
            cart.items.push({
                productId: item.productId,
                name: item.name,
                price: item.price,
                quantity,
                imageUrl: item.imageUrl
            });
        }
        await cart_repository_1.cartRepository.save(cart);
        return cart;
    },
    async setQuantity(customerId, productId, quantity) {
        const cart = await cart_repository_1.cartRepository.findOrCreateByCustomerId(customerId);
        const item = cart.items.find(i => i.productId.toString() === productId);
        if (!item) {
            throw new error_1.ApiError(404, 'CART_ITEM_NOT_FOUND', 'Cart item not found');
        }
        item.quantity = Math.max(1, quantity);
        await cart_repository_1.cartRepository.save(cart);
        return cart;
    },
    async removeItem(customerId, productId) {
        const cart = await cart_repository_1.cartRepository.findOrCreateByCustomerId(customerId);
        cart.items = cart.items.filter(i => i.productId.toString() !== productId);
        await cart_repository_1.cartRepository.save(cart);
        return cart;
    },
    async clear(customerId) {
        const cart = await cart_repository_1.cartRepository.findOrCreateByCustomerId(customerId);
        cart.items = [];
        await cart_repository_1.cartRepository.save(cart);
        return cart;
    }
};
