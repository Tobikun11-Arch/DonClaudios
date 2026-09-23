import {z} from 'zod';

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

export const createProductDto = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  ingredients: z.array(productIngredient).max(50).optional(),
  allergens: z
    .array(z.enum(ALLERGEN_VALUES))
    .max(ALLERGEN_VALUES.length)
    .optional(),
  isAvailable: z.coerce.boolean().optional()
});

export type CreateProductDto = z.infer<typeof createProductDto>;

export const updateProductDto = createProductDto.partial();

export type UpdateProductDto = z.infer<typeof updateProductDto>;
