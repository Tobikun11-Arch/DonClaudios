import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {categoryRepository} from '../repositories/category.repository';
import type {CategoryDocument} from '../models/Category.model';
import type {StockUnit} from '../models/Category.model';
import {
  type ProductAllergen,
  type ProductIngredient
} from '../models/Product.model';
import {initialPointsCostForPrice} from '../config/rewards';

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
      prepTimeMinutes?: number;
      ingredients?: ProductIngredient[];
      allergens?: ProductAllergen[];
      isAvailable?: boolean;
      pointsCost?: number | null;
      promoType?: 'percentage' | 'fixed_amount' | 'bundle';
      discountRate?: number;
      discountAmount?: number;
      promoStartDate?: string;
      promoEndDate?: string;
      isPromoActive?: boolean;
    }
  ) {
    const category = await resolveCategory(data.category);
    return productRepository.create({
      ...data,
      stockUnit: category.stockUnit,
      isAvailable: data.isAvailable ?? true,
      // Seed new products that were not given an explicit owner-set cost.
      pointsCost: data.pointsCost ?? initialPointsCostForPrice(data.price),
      promoType: data.promoType,
      discountRate: data.discountRate,
      discountAmount: data.discountAmount,
      promoStartDate: data.promoStartDate
        ? new Date(data.promoStartDate)
        : undefined,
      promoEndDate: data.promoEndDate ? new Date(data.promoEndDate) : undefined,
      isPromoActive: data.isPromoActive,
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
      prepTimeMinutes?: number;
      ingredients?: ProductIngredient[];
      allergens?: ProductAllergen[];
      isAvailable?: boolean;
      pointsCost?: number | null;
      promoType?: 'percentage' | 'fixed_amount' | 'bundle';
      discountRate?: number;
      discountAmount?: number;
      promoStartDate?: string;
      promoEndDate?: string;
      isPromoActive?: boolean;
    }
  ) {
    if (data.category) {
      const category = await resolveCategory(data.category);
      data = {...data, stockUnit: category.stockUnit};
    }
    // pointsCost is intentionally NOT defaulted here: Mongoose
    // skips undefined, so omitting it leaves an existing owner-set cost intact,
    // and sending an explicit null clears it.
    const updateData: any = {...data};
    if (data.promoStartDate) {
      updateData.promoStartDate = new Date(data.promoStartDate);
    }
    if (data.promoEndDate) {
      updateData.promoEndDate = new Date(data.promoEndDate);
    }
    const updated = await productRepository.updateById(id, updateData);
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
