import {PromoDocument, PromoModel} from '../models/Promo.model';

export const promoRepository = {
  findById: (id: string) => PromoModel.findById(id).exec(),

  listPublic: () => PromoModel.find({}).sort({createdAt: -1}).exec(),

  create: (data: Partial<PromoDocument>) => PromoModel.create(data),

  updateById: (id: string, data: Partial<PromoDocument>) =>
    PromoModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => PromoModel.findByIdAndDelete(id).exec()
};
