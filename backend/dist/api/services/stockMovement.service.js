"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockMovementService = void 0;
const error_1 = require("../utils/error");
const product_repository_1 = require("../repositories/product.repository");
const stockMovement_repository_1 = require("../repositories/stockMovement.repository");
const orderItem_repository_1 = require("../repositories/orderItem.repository");
exports.stockMovementService = {
    async restockProduct(productId, adminId, data) {
        const product = await product_repository_1.productRepository.findById(productId);
        if (!product) {
            throw new error_1.ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
        }
        const previousStock = product.stock;
        const newStock = previousStock + data.quantity;
        product.stock = newStock;
        await product.save();
        await stockMovement_repository_1.stockMovementRepository.create({
            productId: product._id,
            type: 'restock',
            quantity: data.quantity,
            previousStock,
            newStock,
            note: data.note,
            performedBy: adminId
        });
        return product;
    },
    async adjustStock(productId, adminId, data) {
        const product = await product_repository_1.productRepository.findById(productId);
        if (!product) {
            throw new error_1.ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
        }
        const previousStock = product.stock;
        const newStock = previousStock + data.quantity;
        if (newStock < 0) {
            throw new error_1.ApiError(400, 'INSUFFICIENT_STOCK', `Cannot adjust by ${data.quantity}. Current stock is ${previousStock}`);
        }
        product.stock = newStock;
        await product.save();
        await stockMovement_repository_1.stockMovementRepository.create({
            productId: product._id,
            type: data.reason,
            quantity: data.quantity,
            previousStock,
            newStock,
            note: data.note,
            performedBy: adminId
        });
        return product;
    },
    async listMovements(productId) {
        if (productId) {
            return stockMovement_repository_1.stockMovementRepository.findByProductId(productId);
        }
        return stockMovement_repository_1.stockMovementRepository.listAll();
    },
    async deductOrderStock(orderId) {
        const items = await orderItem_repository_1.orderItemRepository.listByOrderId(orderId);
        const movements = [];
        for (const item of items) {
            const product = await product_repository_1.productRepository.findById(String(item.productId));
            if (!product) {
                throw new error_1.ApiError(404, 'PRODUCT_NOT_FOUND', `Product ${item.productId} not found`);
            }
            if (product.stock < item.quantity) {
                throw new error_1.ApiError(400, 'INSUFFICIENT_STOCK', `Insufficient stock for "${product.name}". Available: ${product.stock}, needed: ${item.quantity}`);
            }
            const previousStock = product.stock;
            const newStock = previousStock - item.quantity;
            product.stock = newStock;
            await product.save();
            movements.push({
                productId: String(product._id),
                quantity: -item.quantity,
                previousStock,
                newStock
            });
        }
        return movements;
    },
    async restoreOrderStock(orderId, adminId) {
        const items = await orderItem_repository_1.orderItemRepository.listByOrderId(orderId);
        const movements = [];
        for (const item of items) {
            const product = await product_repository_1.productRepository.findById(String(item.productId));
            if (!product)
                continue;
            const previousStock = product.stock;
            const newStock = previousStock + item.quantity;
            product.stock = newStock;
            await product.save();
            movements.push({
                productId: String(product._id),
                quantity: item.quantity,
                previousStock,
                newStock
            });
        }
        await Promise.all(movements.map(m => stockMovement_repository_1.stockMovementRepository.create({
            productId: m.productId,
            type: 'adjustment',
            quantity: m.quantity,
            previousStock: m.previousStock,
            newStock: m.newStock,
            note: 'Order cancelled — stock restored',
            performedBy: adminId
        })));
        return movements;
    }
};
