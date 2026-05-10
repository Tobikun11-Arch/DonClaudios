import mongoose from 'mongoose';
import {ApiError} from '../utils/error';
import {promoRepository} from '../repositories/promo.repository';

export const promoService = {
  async list() {
    return promoRepository.listPublic();
  },

  async listAll() {
    return promoRepository.listAll();
  },

  async getById(id: string) {
    const promo = await promoRepository.findById(id);
    if (!promo) {
      throw new ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
    }
    return promo;
  },

  async create(
    adminId: string,
    data: {
      title: string;
      description?: string;
      imageUrl?: string;
      promoType: 'percentage' | 'fixed_amount' | 'bundle';
      price?: number;
      discountRate?: number;
      discountAmount?: number;
      productIds?: string[];
      startDate: Date;
      endDate: Date;
      isActive?: boolean;
    }
  ) {
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      throw new ApiError(400, 'INVALID_ADMIN_ID', 'Invalid admin id');
    }

    if (data.endDate < data.startDate) {
      throw new ApiError(
        400,
        'INVALID_DATES',
        'endDate must be after startDate'
      );
    }

    const hasRate = typeof data.discountRate === 'number';
    const hasAmount = typeof data.discountAmount === 'number';
    const hasPrice = typeof data.price === 'number';
    const productCount = data.productIds?.length ?? 0;

    if (data.promoType === 'percentage') {
      if (!hasRate) {
        throw new ApiError(400, 'INVALID_PROMO', 'discountRate is required');
      }
      if (hasAmount) {
        throw new ApiError(
          400,
          'INVALID_PROMO',
          'discountAmount must be blank'
        );
      }
      if (productCount < 1) {
        throw new ApiError(
          400,
          'INVALID_PROMO',
          'At least 1 product is required'
        );
      }
    }

    if (data.promoType === 'fixed_amount') {
      if (!hasAmount) {
        throw new ApiError(400, 'INVALID_PROMO', 'discountAmount is required');
      }
      if (hasRate) {
        throw new ApiError(400, 'INVALID_PROMO', 'discountRate must be blank');
      }
      if (productCount < 1) {
        throw new ApiError(
          400,
          'INVALID_PROMO',
          'At least 1 product is required'
        );
      }
    }

    if (data.promoType === 'bundle') {
      if (!hasPrice) {
        throw new ApiError(400, 'INVALID_PROMO', 'price is required');
      }
      if (hasRate) {
        throw new ApiError(400, 'INVALID_PROMO', 'discountRate must be blank');
      }
      if (hasAmount) {
        throw new ApiError(
          400,
          'INVALID_PROMO',
          'discountAmount must be blank'
        );
      }
      if (productCount < 1) {
        throw new ApiError(
          400,
          'INVALID_PROMO',
          'At least 1 product is required'
        );
      }
    }

    const productObjectIds = (data.productIds ?? []).map(id => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, 'INVALID_PRODUCT_ID', 'Invalid product id');
      }
      return new mongoose.Types.ObjectId(id);
    });

    return promoRepository.create({
      ...data,
      productIds: productObjectIds.length > 0 ? productObjectIds : undefined,
      isActive: data.isActive ?? true,
      createdBy: new mongoose.Types.ObjectId(adminId)
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      imageUrl?: string;
      promoType?: 'percentage' | 'fixed_amount' | 'bundle';
      price?: number;
      discountRate?: number;
      discountAmount?: number;
      productIds?: string[];
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    }
  ) {
    const promoFieldsChanged =
      typeof data.promoType === 'string' ||
      typeof data.price === 'number' ||
      typeof data.discountRate === 'number' ||
      typeof data.discountAmount === 'number' ||
      Array.isArray(data.productIds);

    if (data.startDate || data.endDate || promoFieldsChanged) {
      const existing = await promoRepository.findById(id);
      if (!existing) {
        throw new ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
      }

      const nextStartDate = data.startDate ?? existing.startDate;
      const nextEndDate = data.endDate ?? existing.endDate;

      const nextPromoType = data.promoType ?? existing.promoType;
      const nextPrice =
        typeof data.price === 'number' ? data.price : existing.price;
      const nextDiscountRate =
        typeof data.discountRate === 'number'
          ? data.discountRate
          : existing.discountRate;
      const nextDiscountAmount =
        typeof data.discountAmount === 'number'
          ? data.discountAmount
          : existing.discountAmount;
      const nextProductIds = Array.isArray(data.productIds)
        ? data.productIds
        : (existing.productIds ?? []).map(oid => oid.toString());

      if (nextEndDate < nextStartDate) {
        throw new ApiError(
          400,
          'INVALID_DATES',
          'endDate must be after startDate'
        );
      }

      const hasRate = typeof nextDiscountRate === 'number';
      const hasAmount = typeof nextDiscountAmount === 'number';
      const hasPrice = typeof nextPrice === 'number';
      const productCount = nextProductIds.length;

      if (nextPromoType === 'percentage') {
        if (!hasRate) {
          throw new ApiError(400, 'INVALID_PROMO', 'discountRate is required');
        }
        if (hasAmount) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'discountAmount must be blank'
          );
        }
        if (productCount < 1) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'At least 1 product is required'
          );
        }
      }

      if (nextPromoType === 'fixed_amount') {
        if (!hasAmount) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'discountAmount is required'
          );
        }
        if (hasRate) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'discountRate must be blank'
          );
        }
        if (productCount < 1) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'At least 1 product is required'
          );
        }
      }

      if (nextPromoType === 'bundle') {
        if (!hasPrice) {
          throw new ApiError(400, 'INVALID_PROMO', 'price is required');
        }
        if (hasRate) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'discountRate must be blank'
          );
        }
        if (hasAmount) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'discountAmount must be blank'
          );
        }
        if (productCount < 1) {
          throw new ApiError(
            400,
            'INVALID_PROMO',
            'At least 1 product is required'
          );
        }
      }
    }

    const productObjectIds = Array.isArray(data.productIds)
      ? data.productIds.map(pid => {
          if (!mongoose.Types.ObjectId.isValid(pid)) {
            throw new ApiError(400, 'INVALID_PRODUCT_ID', 'Invalid product id');
          }
          return new mongoose.Types.ObjectId(pid);
        })
      : undefined;

    const payload = {
      ...data,
      productIds: productObjectIds
    };

    const updated = await promoRepository.updateById(id, payload);
    if (!updated) {
      throw new ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
    }
    return updated;
  },

  async remove(id: string) {
    const deleted = await promoRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
    }
    return {message: 'Deleted'};
  }
};
