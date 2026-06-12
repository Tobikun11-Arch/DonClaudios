"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePromoDto = exports.createPromoDto = void 0;
const zod_1 = require("zod");
const promoBaseDto = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    promoType: zod_1.z.enum(['percentage', 'fixed_amount', 'bundle']),
    price: zod_1.z.coerce.number().min(0).optional(),
    discountRate: zod_1.z.coerce.number().min(0).optional(),
    discountAmount: zod_1.z.coerce.number().min(0).optional(),
    productIds: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    startDate: zod_1.z.coerce.date(),
    endDate: zod_1.z.coerce.date(),
    isActive: zod_1.z.coerce.boolean().optional()
});
exports.createPromoDto = promoBaseDto
    .refine(data => data.endDate >= data.startDate, {
    message: 'endDate must be after startDate'
})
    .superRefine((data, ctx) => {
    const hasPrice = typeof data.price === 'number';
    const hasRate = typeof data.discountRate === 'number';
    const hasAmount = typeof data.discountAmount === 'number';
    const productCount = data.productIds?.length ?? 0;
    if (data.promoType === 'percentage') {
        if (!hasRate) {
            ctx.addIssue({ code: 'custom', message: 'discountRate is required' });
        }
        if (hasAmount) {
            ctx.addIssue({ code: 'custom', message: 'discountAmount must be blank' });
        }
        if (productCount < 1) {
            ctx.addIssue({
                code: 'custom',
                message: 'At least 1 product is required'
            });
        }
    }
    if (data.promoType === 'fixed_amount') {
        if (!hasAmount) {
            ctx.addIssue({ code: 'custom', message: 'discountAmount is required' });
        }
        if (hasRate) {
            ctx.addIssue({ code: 'custom', message: 'discountRate must be blank' });
        }
        if (productCount < 1) {
            ctx.addIssue({
                code: 'custom',
                message: 'At least 1 product is required'
            });
        }
    }
    if (data.promoType === 'bundle') {
        if (!hasPrice) {
            ctx.addIssue({ code: 'custom', message: 'price is required' });
        }
        if (hasRate) {
            ctx.addIssue({ code: 'custom', message: 'discountRate must be blank' });
        }
        if (hasAmount) {
            ctx.addIssue({ code: 'custom', message: 'discountAmount must be blank' });
        }
        if (productCount < 1) {
            ctx.addIssue({
                code: 'custom',
                message: 'At least 1 product is required'
            });
        }
    }
});
exports.updatePromoDto = promoBaseDto.partial();
