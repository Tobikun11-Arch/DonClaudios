"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCashierDto = exports.createCashierDto = void 0;
const zod_1 = require("zod");
exports.createCashierDto = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    username: zod_1.z.string().min(3),
    phoneNumber: zod_1.z.string().min(1).optional(),
    address: zod_1.z.string().min(1).optional()
});
exports.updateCashierDto = exports.createCashierDto.partial();
