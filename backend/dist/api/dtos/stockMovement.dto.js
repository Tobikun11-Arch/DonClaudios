"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustDto = exports.restockDto = void 0;
const zod_1 = require("zod");
exports.restockDto = zod_1.z.object({
    quantity: zod_1.z.number().int().positive('Quantity must be positive'),
    note: zod_1.z.string().max(500).optional()
});
exports.adjustDto = zod_1.z.object({
    quantity: zod_1.z.number().int().refine(v => v !== 0, {
        message: 'Quantity cannot be zero'
    }),
    reason: zod_1.z.enum(['spoilage', 'adjustment']),
    note: zod_1.z.string().max(500).optional()
});
