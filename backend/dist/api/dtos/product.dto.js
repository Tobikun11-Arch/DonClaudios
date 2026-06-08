"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProductDto = exports.createProductDto = void 0;
const zod_1 = require("zod");
exports.createProductDto = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    price: zod_1.z.coerce.number().min(0),
    stock: zod_1.z.coerce.number().int().min(0),
    description: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    isAvailable: zod_1.z.coerce.boolean().optional()
});
exports.updateProductDto = exports.createProductDto.partial();
