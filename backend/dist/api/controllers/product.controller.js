"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = void 0;
const product_service_1 = require("../services/product.service");
const error_1 = require("../utils/error");
exports.productController = {
    async list(_req, res, next) {
        try {
            const products = await product_service_1.productService.list();
            res.status(200).json({ products });
        }
        catch (error) {
            next(error);
        }
    },
    async getById(req, res, next) {
        try {
            const product = await product_service_1.productService.getById(req.params.id);
            res.status(200).json({ product });
        }
        catch (error) {
            next(error);
        }
    },
    async create(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const created = await product_service_1.productService.create(req.auth.userId, req.body);
            res.status(201).json({ product: created });
        }
        catch (error) {
            next(error);
        }
    },
    async update(req, res, next) {
        try {
            const updated = await product_service_1.productService.update(req.params.id, req.body);
            res.status(200).json({ product: updated });
        }
        catch (error) {
            next(error);
        }
    },
    async remove(req, res, next) {
        try {
            const result = await product_service_1.productService.remove(req.params.id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
};
