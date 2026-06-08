"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartController = void 0;
const error_1 = require("../utils/error");
const cart_service_1 = require("../services/cart.service");
exports.cartController = {
    async getMyCart(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const cart = await cart_service_1.cartService.getCart(req.auth.userId);
            res.status(200).json({ cart });
        }
        catch (error) {
            next(error);
        }
    },
    async addItem(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const { productId, name, price, quantity, imageUrl } = req.body;
            const cart = await cart_service_1.cartService.addItem(req.auth.userId, {
                productId,
                name,
                price,
                quantity,
                imageUrl
            });
            res.status(200).json({ cart });
        }
        catch (error) {
            next(error);
        }
    },
    async setQuantity(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const { quantity } = req.body;
            const cart = await cart_service_1.cartService.setQuantity(req.auth.userId, req.params.productId, quantity);
            res.status(200).json({ cart });
        }
        catch (error) {
            next(error);
        }
    },
    async removeItem(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const cart = await cart_service_1.cartService.removeItem(req.auth.userId, req.params.productId);
            res.status(200).json({ cart });
        }
        catch (error) {
            next(error);
        }
    },
    async clear(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const cart = await cart_service_1.cartService.clear(req.auth.userId);
            res.status(200).json({ cart });
        }
        catch (error) {
            next(error);
        }
    }
};
