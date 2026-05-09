import {CartModel} from '../models/Cart.model';

export const cartRepository = {
  findByCustomerId: (customerId: string) =>
    CartModel.findOne({customerId}).exec(),

  findOrCreateByCustomerId: async (customerId: string) => {
    const existing = await CartModel.findOne({customerId}).exec();
    if (existing) return existing;
    return CartModel.create({customerId, items: []});
  },

  save: (cart: any) => cart.save()
};
