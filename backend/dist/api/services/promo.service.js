"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const error_1 = require("../utils/error");
const promo_repository_1 = require("../repositories/promo.repository");
exports.promoService = {
    async list() {
        return promo_repository_1.promoRepository.listPublic();
    },
    async listAll() {
        return promo_repository_1.promoRepository.listAll();
    },
    async getById(id) {
        const promo = await promo_repository_1.promoRepository.findById(id);
        if (!promo) {
            throw new error_1.ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
        }
        return promo;
    },
    async create(adminId, data) {
        if (!mongoose_1.default.Types.ObjectId.isValid(adminId)) {
            throw new error_1.ApiError(400, 'INVALID_ADMIN_ID', 'Invalid admin id');
        }
        if (data.endDate < data.startDate) {
            throw new error_1.ApiError(400, 'INVALID_DATES', 'endDate must be after startDate');
        }
        const hasRate = typeof data.discountRate === 'number';
        const hasAmount = typeof data.discountAmount === 'number';
        const hasPrice = typeof data.price === 'number';
        const productCount = data.productIds?.length ?? 0;
        if (data.promoType === 'percentage') {
            if (!hasRate) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountRate is required');
            }
            if (hasAmount) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountAmount must be blank');
            }
            if (productCount < 1) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'At least 1 product is required');
            }
        }
        if (data.promoType === 'fixed_amount') {
            if (!hasAmount) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountAmount is required');
            }
            if (hasRate) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountRate must be blank');
            }
            if (productCount < 1) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'At least 1 product is required');
            }
        }
        if (data.promoType === 'bundle') {
            if (!hasPrice) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'price is required');
            }
            if (hasRate) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountRate must be blank');
            }
            if (hasAmount) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountAmount must be blank');
            }
            if (productCount < 1) {
                throw new error_1.ApiError(400, 'INVALID_PROMO', 'At least 1 product is required');
            }
        }
        const productObjectIds = (data.productIds ?? []).map(id => {
            if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
                throw new error_1.ApiError(400, 'INVALID_PRODUCT_ID', 'Invalid product id');
            }
            return new mongoose_1.default.Types.ObjectId(id);
        });
        return promo_repository_1.promoRepository.create({
            ...data,
            productIds: productObjectIds.length > 0 ? productObjectIds : undefined,
            isActive: data.isActive ?? true,
            createdBy: new mongoose_1.default.Types.ObjectId(adminId)
        });
    },
    async update(id, data) {
        const promoFieldsChanged = typeof data.promoType === 'string' ||
            typeof data.price === 'number' ||
            typeof data.discountRate === 'number' ||
            typeof data.discountAmount === 'number' ||
            Array.isArray(data.productIds);
        if (data.startDate || data.endDate || promoFieldsChanged) {
            const existing = await promo_repository_1.promoRepository.findById(id);
            if (!existing) {
                throw new error_1.ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
            }
            const nextStartDate = data.startDate ?? existing.startDate;
            const nextEndDate = data.endDate ?? existing.endDate;
            const nextPromoType = data.promoType ?? existing.promoType;
            const nextPrice = typeof data.price === 'number' ? data.price : existing.price;
            const nextDiscountRate = typeof data.discountRate === 'number'
                ? data.discountRate
                : existing.discountRate;
            const nextDiscountAmount = typeof data.discountAmount === 'number'
                ? data.discountAmount
                : existing.discountAmount;
            const nextProductIds = Array.isArray(data.productIds)
                ? data.productIds
                : (existing.productIds ?? []).map(oid => oid.toString());
            if (nextEndDate < nextStartDate) {
                throw new error_1.ApiError(400, 'INVALID_DATES', 'endDate must be after startDate');
            }
            const hasRate = typeof nextDiscountRate === 'number';
            const hasAmount = typeof nextDiscountAmount === 'number';
            const hasPrice = typeof nextPrice === 'number';
            const productCount = nextProductIds.length;
            if (nextPromoType === 'percentage') {
                if (!hasRate) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountRate is required');
                }
                if (hasAmount) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountAmount must be blank');
                }
                if (productCount < 1) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'At least 1 product is required');
                }
            }
            if (nextPromoType === 'fixed_amount') {
                if (!hasAmount) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountAmount is required');
                }
                if (hasRate) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountRate must be blank');
                }
                if (productCount < 1) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'At least 1 product is required');
                }
            }
            if (nextPromoType === 'bundle') {
                if (!hasPrice) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'price is required');
                }
                if (hasRate) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountRate must be blank');
                }
                if (hasAmount) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'discountAmount must be blank');
                }
                if (productCount < 1) {
                    throw new error_1.ApiError(400, 'INVALID_PROMO', 'At least 1 product is required');
                }
            }
        }
        const productObjectIds = Array.isArray(data.productIds)
            ? data.productIds.map(pid => {
                if (!mongoose_1.default.Types.ObjectId.isValid(pid)) {
                    throw new error_1.ApiError(400, 'INVALID_PRODUCT_ID', 'Invalid product id');
                }
                return new mongoose_1.default.Types.ObjectId(pid);
            })
            : undefined;
        const payload = {
            ...data,
            productIds: productObjectIds
        };
        const updated = await promo_repository_1.promoRepository.updateById(id, payload);
        if (!updated) {
            throw new error_1.ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
        }
        return updated;
    },
    async remove(id) {
        const deleted = await promo_repository_1.promoRepository.deleteById(id);
        if (!deleted) {
            throw new error_1.ApiError(404, 'PROMO_NOT_FOUND', 'Promo not found');
        }
        return { message: 'Deleted' };
    }
};
