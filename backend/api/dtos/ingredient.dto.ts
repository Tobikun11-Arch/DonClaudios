import {z} from 'zod';
import {INGREDIENT_STATUSES} from '../models/Ingredient.model';

export const createIngredientDto = z.object({
  name: z.string().min(1).max(80),
  iconKey: z.string().min(1).max(64),
  status: z.enum(INGREDIENT_STATUSES).default('pending')
});

export type CreateIngredientDto = z.infer<typeof createIngredientDto>;

export const updateIngredientDto = createIngredientDto.partial();

export type UpdateIngredientDto = z.infer<typeof updateIngredientDto>;