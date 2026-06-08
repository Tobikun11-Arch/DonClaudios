"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerModel = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BaseUser_schema_1 = require("./base/BaseUser.schema");
const CustomerSchema = (0, BaseUser_schema_1.createBaseUserSchema)();
exports.CustomerModel = mongoose_1.default.model('Customer', CustomerSchema, 'customers');
