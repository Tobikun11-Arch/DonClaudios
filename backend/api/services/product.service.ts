import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';

export const productService = {
  async list() {
    return productRepository.listPublic();
  },

  async getById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return product;
  },

  async create(
    adminId: string,
    data: {
      name: string;
      category: string;
      price: number;
      stock: number;
      description?: string;
      imageUrl?: string;
      isAvailable?: boolean;
    }
  ) {
    return productRepository.create({
      ...data,
      isAvailable: data.isAvailable ?? true,
      createdBy: adminId
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      description?: string;
      imageUrl?: string;
      isAvailable?: boolean;
    }
  ) {
    const updated = await productRepository.updateById(id, data);
    if (!updated) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return updated;
  },

  async remove(id: string) {
    const deleted = await productRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return {message: 'Deleted'};
  }
};
