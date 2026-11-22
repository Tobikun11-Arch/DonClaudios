import {z} from 'zod';
import {CATEGORY_TYPES, STOCK_UNITS} from '../models/Category.model';

export const createCategoryDto = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(CATEGORY_TYPES),
  stockUnit: z.enum(STOCK_UNITS),
  imageUrl: z.string().url().nullable().optional(),
  // Hours of notice customers must give (lechon); null = none / default.
  minNoticeHours: z.number().int().min(0).max(72).nullable().optional(),
  // Pinned as a chip in the menu's top bar; the rest are in the Categories panel.
  showInTopBar: z.boolean().optional()
});

export type CreateCategoryDto = z.infer<typeof createCategoryDto>;

export const updateCategoryDto = createCategoryDto.partial();

export type UpdateCategoryDto = z.infer<typeof updateCategoryDto>;

/** Full menu order: every category id, first to last. */
export const reorderCategoriesDto = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200)
});

export type ReorderCategoriesDto = z.infer<typeof reorderCategoriesDto>;
