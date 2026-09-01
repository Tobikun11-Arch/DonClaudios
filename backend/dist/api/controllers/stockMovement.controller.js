"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockMovementController = void 0;
const stockMovement_service_1 = require("../services/stockMovement.service");
const error_1 = require("../utils/error");
exports.stockMovementController = {
    async restock(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const product = await stockMovement_service_1.stockMovementService.restockProduct(req.params.productId, req.auth.userId, req.body);
            res.status(200).json({ product });
        }
        catch (error) {
            next(error);
        }
    },
    async adjust(req, res, next) {
        try {
            if (!req.auth) {
                throw new error_1.ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
            }
            const product = await stockMovement_service_1.stockMovementService.adjustStock(req.params.productId, req.auth.userId, req.body);
            res.status(200).json({ product });
        }
        catch (error) {
            next(error);
        }
    },
    async listMovements(req, res, next) {
        try {
            const productId = req.query.productId;
            const movements = await stockMovement_service_1.stockMovementService.listMovements(productId);
            res.status(200).json({ movements });
        }
        catch (error) {
            next(error);
        }
    }
};
