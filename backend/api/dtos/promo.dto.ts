import {z} from 'zod';

const promoBaseDto = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  discountRate: z.coerce.number().min(0),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.coerce.boolean().optional()
});

export const createPromoDto = promoBaseDto.refine(
  data => data.endDate >= data.startDate,
  {
    message: 'endDate must be after startDate'
  }
);

export type CreatePromoDto = z.infer<typeof createPromoDto>;

export const updatePromoDto = promoBaseDto.partial();

export type UpdatePromoDto = z.infer<typeof updatePromoDto>;
