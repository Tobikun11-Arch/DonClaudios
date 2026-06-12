"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRepository = void 0;
const Cart_model_1 = require("../models/Cart.model");
exports.cartRepository = {
    findByCustomerId: (customerId) => Cart_model_1.CartModel.findOne({ customerId }).exec(),
    findOrCreateByCustomerId: async (customerId) => {
        const existing = await Cart_model_1.CartModel.findOne({ customerId }).exec();
        if (existing)
            return existing;
        return Cart_model_1.CartModel.create({ customerId, items: [] });
    },
    save: (cart) => cart.save()
};
