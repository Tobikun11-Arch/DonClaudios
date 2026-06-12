"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashierModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BaseUser_schema_1 = require("./base/BaseUser.schema");
const CashierSchema = (0, BaseUser_schema_1.createBaseUserSchema)();
CashierSchema.add({
    username: { type: String, required: true, unique: true, trim: true },
    isOnline: { type: Boolean, default: false }
});
exports.CashierModel = mongoose_1.default.model('Cashier', CashierSchema, 'cashiers');
