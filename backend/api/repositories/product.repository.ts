import {ProductDocument, ProductModel} from '../models/Product.model';

export const productRepository = {
  findById: (id: string) => ProductModel.findById(id).exec(),

  findByIds: (ids: string[]) =>
    ProductModel.find({_id: {$in: ids}})
      .select('prepTimeMinutes')
      .exec(),

  listPublic: () =>
    ProductModel.find({})
      .populate('createdBy', 'firstName lastName')
      .sort({createdAt: -1})
      .exec(),

  create: (data: Partial<ProductDocument>) => ProductModel.create(data),

  updateById: (id: string, data: Partial<ProductDocument>) =>
    ProductModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => ProductModel.findByIdAndDelete(id).exec(),

  countByCategory: (category: string) =>
    ProductModel.countDocuments({category}).exec()
};
