import {ApiError} from '../utils/error';
import {promoRepository} from '../repositories/promo.repository';

export const promoService = {
  async list() {
    return promoRepository.listPublic();
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
      discountRate: number;
      startDate: Date;
      endDate: Date;
      isActive?: boolean;
    }
  ) {
    if (data.endDate < data.startDate) {
      throw new ApiError(400, 'INVALID_DATES', 'endDate must be after startDate');
    }

    return promoRepository.create({
      ...data,
      isActive: data.isActive ?? true,
      createdBy: adminId
    });
  },

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      discountRate?: number;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    }
  ) {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      throw new ApiError(400, 'INVALID_DATES', 'endDate must be after startDate');
    }

    const updated = await promoRepository.updateById(id, data);
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
