import {z} from 'zod';
import {CATEGORY_TYPES, STOCK_UNITS} from '../models/Category.model';

export const createCategoryDto = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(CATEGORY_TYPES),
  stockUnit: z.enum(STOCK_UNITS),
  imageUrl: z.string().url().nullable().optional()
});

export type CreateCategoryDto = z.infer<typeof createCategoryDto>;

export const updateCategoryDto = createCategoryDto.partial();

export type UpdateCategoryDto = z.infer<typeof updateCategoryDto>;