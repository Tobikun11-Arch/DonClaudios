"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyReviewDto = exports.updateReviewStatusDto = exports.createReviewDto = void 0;
const zod_1 = require("zod");
exports.createReviewDto = zod_1.z.object({
    rating: zod_1.z.coerce.number().int().min(1).max(5),
    comment: zod_1.z.string().min(1).max(1000)
});
exports.updateReviewStatusDto = zod_1.z.object({
    status: zod_1.z.enum(['pending', 'approved', 'rejected'])
});
exports.replyReviewDto = zod_1.z.object({
    reply: zod_1.z.string().min(1).max(2000)
});
