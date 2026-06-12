"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cashierRepository = void 0;
const Cashier_model_1 = require("../models/Cashier.model");
exports.cashierRepository = {
    findByEmail: (email) => Cashier_model_1.CashierModel.findOne({ email: email.toLowerCase() }).exec(),
    findByUsername: (username) => Cashier_model_1.CashierModel.findOne({ username: username.trim() }).exec(),
    findByEmailOrPhoneNumber: (identifier) => Cashier_model_1.CashierModel.findOne({
        $or: [{ email: identifier.toLowerCase() }, { phoneNumber: identifier }]
    }).exec(),
    findById: (id) => Cashier_model_1.CashierModel.findById(id).exec(),
    listAll: () => Cashier_model_1.CashierModel.find({}).sort({ createdAt: -1 }).exec(),
    create: (data) => Cashier_model_1.CashierModel.create(data),
    updateById: (id, data) => Cashier_model_1.CashierModel.findByIdAndUpdate(id, data, { new: true }).exec(),
    deleteById: (id) => Cashier_model_1.CashierModel.findByIdAndDelete(id).exec()
};
