import {z} from 'zod';

export const createProductDto = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.coerce.boolean().optional()
});

export type CreateProductDto = z.infer<typeof createProductDto>;

export const updateProductDto = createProductDto.partial();

export type UpdateProductDto = z.infer<typeof updateProductDto>;
