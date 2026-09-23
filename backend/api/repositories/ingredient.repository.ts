import {IngredientDocument, IngredientModel} from '../models/Ingredient.model';

export const ingredientRepository = {
  list: () => IngredientModel.find({}).sort({name: 1}).exec(),

  findById: (id: string) => IngredientModel.findById(id).exec(),

  findByKey: (key: string) => IngredientModel.findOne({key}).exec(),

  create: (data: Partial<IngredientDocument>) => IngredientModel.create(data),

  updateById: (id: string, data: Partial<IngredientDocument>) =>
    IngredientModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => IngredientModel.findByIdAndDelete(id).exec()
};