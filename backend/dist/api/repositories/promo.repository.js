"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promoRepository = void 0;
const Promo_model_1 = require("../models/Promo.model");
exports.promoRepository = {
    findById: (id) => Promo_model_1.PromoModel.findById(id).exec(),
    listPublic: () => {
        const now = new Date();
        return Promo_model_1.PromoModel.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        })
            .sort({ createdAt: -1 })
            .exec();
    },
    listAll: () => Promo_model_1.PromoModel.find({}).sort({ createdAt: -1 }).exec(),
    create: (data) => Promo_model_1.PromoModel.create(data),
    updateById: (id, data) => Promo_model_1.PromoModel.findByIdAndUpdate(id, data, { new: true }).exec(),
    deleteById: (id) => Promo_model_1.PromoModel.findByIdAndDelete(id).exec()
};
