import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {categoryRepository} from '../repositories/category.repository';
import type {CategoryDocument} from '../models/Category.model';
import type {StockUnit} from '../models/Category.model';
import {
  type ProductAllergen,
  type ProductIngredient
} from '../models/Product.model';

async function resolveCategory(
  categoryName: string
): Promise<CategoryDocument> {
  const category = await categoryRepository.findByName(categoryName);
  if (!category) {
    throw new ApiError(
      422,
      'CATEGORY_NOT_FOUND',
      `Category "${categoryName}" is not in your category list. Add it in Settings > Menu Categories first.`
    );
  }
  return category;
}

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
      stockUnit?: StockUnit;
      description?: string;
      imageUrl?: string;
      ingredients?: ProductIngredient[];
      allergens?: ProductAllergen[];
      isAvailable?: boolean;
    }
  ) {
    const category = await resolveCategory(data.category);
    return productRepository.create({
      ...data,
      stockUnit: category.stockUnit,
      isAvailable: data.isAvailable ?? true,
      createdBy: adminId as any
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      stockUnit?: StockUnit;
      description?: string;
      imageUrl?: string;
      ingredients?: ProductIngredient[];
      allergens?: ProductAllergen[];
      isAvailable?: boolean;
    }
  ) {
    if (data.category) {
      const category = await resolveCategory(data.category);
      data = {...data, stockUnit: category.stockUnit};
    }
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
