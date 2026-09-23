import {ApiError} from '../utils/error';
import {ingredientRepository} from '../repositories/ingredient.repository';
import {slugifyIngredientName, type IngredientStatus} from '../models/Ingredient.model';

export const ingredientService = {
  async list() {
    return ingredientRepository.list();
  },

  async create(
    adminId: string,
    data: {
      name: string;
      iconKey: string;
      status?: IngredientStatus;
    }
  ) {
    const key = slugifyIngredientName(data.name);
    const existing = await ingredientRepository.findByKey(key);
    if (existing) {
      throw new ApiError(409, 'INGREDIENT_EXISTS', 'Ingredient already exists');
    }
    return ingredientRepository.create({
      ...data,
      key,
      status: data.status ?? 'pending',
      createdBy: adminId as any
    });
  },

  async update(id: string, data: Partial<{name: string; iconKey: string; status: IngredientStatus}>) {
    const updated = await ingredientRepository.updateById(id, data);
    if (!updated) {
      throw new ApiError(404, 'INGREDIENT_NOT_FOUND', 'Ingredient not found');
    }
    return updated;
  },

  async remove(id: string) {
    const deleted = await ingredientRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'INGREDIENT_NOT_FOUND', 'Ingredient not found');
    }
    return {message: 'Deleted'};
  }
};