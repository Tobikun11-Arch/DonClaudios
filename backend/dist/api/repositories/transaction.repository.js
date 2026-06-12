"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRepository = void 0;
const Transaction_model_1 = require("../models/Transaction.model");
exports.transactionRepository = {
    findById: (id) => Transaction_model_1.TransactionModel.findById(id).exec(),
    findByOrderId: (orderId) => Transaction_model_1.TransactionModel.findOne({ orderId }).exec(),
    listByCashierId: (cashierId) => Transaction_model_1.TransactionModel.find({ cashierId }).sort({ timestamp: -1 }).exec(),
    create: (data) => Transaction_model_1.TransactionModel.create(data)
};
