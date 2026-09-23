import {ApiError} from '../utils/error';
import {categoryRepository} from '../repositories/category.repository';
import {slugifyCategoryName} from '../models/Category.model';
import {productRepository} from '../repositories/product.repository';
import type {CategoryType, StockUnit} from '../models/Category.model';

type CategoryInput = {
  name?: string;
  type?: CategoryType;
  stockUnit?: StockUnit;
  key?: string;
};

export const categoryService = {
  async list() {
    return categoryRepository.list();
  },

  async create(adminId: string, data: CategoryInput) {
    const name = data.name?.trim() ?? '';
    const key = slugifyCategoryName(name);

    const existing = await categoryRepository.findByKey(key);
    if (existing) {
      throw new ApiError(
        409,
        'CATEGORY_EXISTS',
        `Category "${existing.name}" already exists`
      );
    }

    return categoryRepository.create({
      ...data,
      name,
      key,
      createdBy: adminId as any
    });
  },

  async update(id: string, data: CategoryInput) {
    if (data.name) {
      const name = data.name.trim();
      const key = slugifyCategoryName(name);

      const existing = await categoryRepository.findByKey(key);
      if (existing && String(existing._id) !== id) {
        throw new ApiError(
          409,
          'CATEGORY_EXISTS',
          `Category "${existing.name}" already exists`
        );
      }

      data.name = name;
      data = {...data, key};
    }

    const updated = await categoryRepository.updateById(id, data);
    if (!updated) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    return updated;
  },

  async remove(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }

    const usingProducts = await productRepository.countByCategory(category.name);
    if (usingProducts > 0) {
      throw new ApiError(
        409,
        'CATEGORY_IN_USE',
        `Cannot delete "${category.name}": ${usingProducts} product${
          usingProducts === 1 ? '' : 's'
        } still use this category. Move them to another category first.`
      );
    }

    const deleted = await categoryRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    return {message: 'Deleted'};
  }
};