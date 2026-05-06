import {z} from 'zod';

const promoBaseDto = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  promoType: z.enum(['percentage', 'fixed_amount', 'bundle']),
  discountRate: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  productIds: z.array(z.string().min(1)).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.coerce.boolean().optional()
});

export const createPromoDto = promoBaseDto
  .refine(data => data.endDate >= data.startDate, {
    message: 'endDate must be after startDate'
  })
  .superRefine((data, ctx) => {
    const hasRate = typeof data.discountRate === 'number';
    const hasAmount = typeof data.discountAmount === 'number';
    const productCount = data.productIds?.length ?? 0;

    if (data.promoType === 'percentage') {
      if (!hasRate) {
        ctx.addIssue({code: 'custom', message: 'discountRate is required'});
      }
      if (hasAmount) {
        ctx.addIssue({code: 'custom', message: 'discountAmount must be blank'});
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
        ctx.addIssue({code: 'custom', message: 'discountAmount is required'});
      }
      if (hasRate) {
        ctx.addIssue({code: 'custom', message: 'discountRate must be blank'});
      }
      if (productCount < 1) {
        ctx.addIssue({
          code: 'custom',
          message: 'At least 1 product is required'
        });
      }
    }

    if (data.promoType === 'bundle') {
      if (hasRate && hasAmount) {
        return;
      }
      if (hasRate || hasAmount) {
        return;
      }
      return;
    }
  });

export type CreatePromoDto = z.infer<typeof createPromoDto>;

export const updatePromoDto = promoBaseDto.partial();

export type UpdatePromoDto = z.infer<typeof updatePromoDto>;
