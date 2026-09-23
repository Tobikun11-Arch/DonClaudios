import {
  CategoryDocument,
  CategoryModel,
  slugifyCategoryName
} from '../models/Category.model';

export const categoryRepository = {
  list: () =>
    CategoryModel.find({}).sort({sortOrder: 1, name: 1}).exec(),

  findById: (id: string) => CategoryModel.findById(id).exec(),

  findByKey: (key: string) => CategoryModel.findOne({key}).exec(),

  findByName: (name: string) =>
    CategoryModel.findOne({key: slugifyCategoryName(name)}).exec(),

  create: (data: Partial<CategoryDocument>) => CategoryModel.create(data),

  updateById: (id: string, data: Partial<CategoryDocument>) =>
    CategoryModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => CategoryModel.findByIdAndDelete(id).exec()
};