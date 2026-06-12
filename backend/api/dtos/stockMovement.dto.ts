import {z} from 'zod';

export const restockDto = z.object({
  quantity: z.number().int().positive('Quantity must be positive'),
  note: z.string().max(500).optional()
});

export const adjustDto = z.object({
  quantity: z.number().int().refine(v => v !== 0, {
    message: 'Quantity cannot be zero'
  }),
  reason: z.enum(['spoilage', 'adjustment']),
  note: z.string().max(500).optional()
});
