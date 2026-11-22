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

  deleteById: (id: string) => CategoryModel.findByIdAndDelete(id).exec(),

  /** Highest sortOrder in use, so a new category is appended at the end. */
  maxSortOrder: async () => {
    const last = await CategoryModel.findOne({}).sort({sortOrder: -1}).select('sortOrder').lean();
    return typeof last?.sortOrder === 'number' ? last.sortOrder : 0;
  },

  /** sortOrder = position in `ids` (first = 0). */
  setOrder: (ids: string[]) =>
    CategoryModel.bulkWrite(
      ids.map((id, index) => ({
        updateOne: {filter: {_id: id}, update: {$set: {sortOrder: index}}}
      }))
    )
};