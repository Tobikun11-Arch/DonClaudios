import {z} from 'zod';
import {STOCK_UNITS} from '../models/Category.model';

export const ALLERGEN_VALUES = [
  'peanut',
  'tree_nut',
  'shellfish',
  'fish',
  'egg',
  'dairy',
  'soy',
  'gluten',
  'sesame',
  'pork',
  'beef',
  'spicy'
] as const;

export type ProductAllergen = (typeof ALLERGEN_VALUES)[number];

export const productIngredient = z.object({
  name: z.string().min(1).max(80),
  iconKey: z.string().min(1).max(64)
});

/**
 * One pre-order batch. Only the wall-clock window and its stock come from
 * the client — `sold` is maintained server-side and is never accepted here.
 */
export const preOrderBatchDto = z.object({
  startTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  stock: z.coerce.number().int().min(1)
});

export const createProductDto = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  stockUnit: z.enum(STOCK_UNITS).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  ingredients: z.array(productIngredient).max(50).optional(),
  allergens: z
    .array(z.enum(ALLERGEN_VALUES))
    .max(ALLERGEN_VALUES.length)
    .optional(),
  isAvailable: z.coerce.boolean().optional(),
  pointsCost: z.preprocess(
    value => (value === '' || value === null ? null : value),
    z.coerce.number().int().min(0).nullable().optional()
  ),
  promoType: z.enum(['percentage', 'fixed_amount', 'bundle']).optional(),
  discountRate: z.preprocess(
    value => (value === '' || value === null ? undefined : value),
    z.coerce.number().min(0).max(100).optional()
  ),
  discountAmount: z.preprocess(
    value => (value === '' || value === null ? undefined : value),
    z.coerce.number().min(0).optional()
  ),
  promoStartDate: z.string().optional(),
  promoEndDate: z.string().optional(),
  isPromoActive: z.coerce.boolean().optional(),
  // Pre-order fields. The cross-field rules (eligible category, limit > 0,
  // deadline required and not in the past) are enforced in product.service
  // so the checks stay next to the database write.
  //
  // The deadline is accepted as a raw string on purpose: it may be a
  // bare 'YYYY-MM-DD' from <input type="date">, and converting that to the
  // correct end-of-day instant is done once, in preOrder.ts.
  isPreOrder: z.coerce.boolean().optional(),
  preOrderPurchaseLimit: z.preprocess(
    value => (value === '' || value === null ? null : value),
    z.coerce.number().int().min(1).nullable().optional()
  ),
  preOrderDeadline: z.preprocess(
    value => (value === '' || value === null ? null : value),
    z.string().nullable().optional()
  ),
  // null clears every batch (pre-order off); undefined means "not touched"
  // on a partial update so existing batches carry over.
  preOrderBatches: z.preprocess(
    value => (value === '' ? null : value),
    z.array(preOrderBatchDto).max(7).nullable().optional()
  )
});

export type CreateProductDto = z.infer<typeof createProductDto>;

export const updateProductDto = createProductDto.partial();

export type UpdateProductDto = z.infer<typeof updateProductDto>;
