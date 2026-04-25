import {ProductDocument, ProductModel} from '../models/Product.model';

export const productRepository = {
  findById: (id: string) => ProductModel.findById(id).exec(),

  listPublic: () => ProductModel.find({}).sort({createdAt: -1}).exec(),

  create: (data: Partial<ProductDocument>) => ProductModel.create(data),

  updateById: (id: string, data: Partial<ProductDocument>) =>
    ProductModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => ProductModel.findByIdAndDelete(id).exec()
};
