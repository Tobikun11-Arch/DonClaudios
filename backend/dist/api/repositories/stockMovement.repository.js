"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockMovementRepository = void 0;
const StockMovement_model_1 = require("../models/StockMovement.model");
exports.stockMovementRepository = {
    findByProductId: (productId) => StockMovement_model_1.StockMovementModel.find({ productId })
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .exec(),
    listAll: () => StockMovement_model_1.StockMovementModel.find({})
        .populate('performedBy', 'firstName lastName')
        .populate('productId', 'name')
        .sort({ createdAt: -1 })
        .exec(),
    create: (data) => StockMovement_model_1.StockMovementModel.create(data)
};
