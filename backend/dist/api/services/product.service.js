"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const error_1 = require("../utils/error");
const product_repository_1 = require("../repositories/product.repository");
exports.productService = {
    async list() {
        return product_repository_1.productRepository.listPublic();
    },
    async getById(id) {
        const product = await product_repository_1.productRepository.findById(id);
        if (!product) {
            throw new error_1.ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
        }
        return product;
    },
    async create(adminId, data) {
        return product_repository_1.productRepository.create({
            ...data,
            isAvailable: data.isAvailable ?? true,
            createdBy: adminId
        });
    },
    async update(id, data) {
        const updated = await product_repository_1.productRepository.updateById(id, data);
        if (!updated) {
            throw new error_1.ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
        }
        return updated;
    },
    async remove(id) {
        const deleted = await product_repository_1.productRepository.deleteById(id);
        if (!deleted) {
            throw new error_1.ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
        }
        return { message: 'Deleted' };
    }
};
