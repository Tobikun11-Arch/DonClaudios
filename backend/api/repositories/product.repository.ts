import type {ClientSession} from 'mongoose';
import {ProductDocument, ProductModel} from '../models/Product.model';

export const productRepository = {
  findById: (id: string, session?: ClientSession) =>
    ProductModel.findById(id, null, {session}).exec(),

  findByIds: (ids: string[], session?: ClientSession) =>
    ProductModel.find({_id: {$in: ids}}, 'prepTimeMinutes', {session}).exec(),

  /** Full documents for many ids. Use `findByIds` when only prep times are needed. */
  findManyByIds: (ids: string[], session?: ClientSession) =>
    ProductModel.find({_id: {$in: ids}}, null, {session}).exec(),

  listPublic: () =>
    ProductModel.find({})
      .populate('createdBy', 'firstName lastName')
      .sort({createdAt: -1})
      .exec(),

  create: (data: Partial<ProductDocument>) => ProductModel.create(data),

  updateById: (id: string, data: Partial<ProductDocument>) =>
    ProductModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => ProductModel.findByIdAndDelete(id).exec(),

  countByCategory: (category: string) =>
    ProductModel.countDocuments({category}).exec(),

  /**
   * Reserve `qty` units from a specific batch, atomically.
   *
   * The filter only matches while the batch still has room
   * (`sold <= stock - qty`), and the same update drops the product total, so
   * two concurrent reservations can never push a batch below zero. Returns
   * null when the batch no longer has enough room. Run inside a session so a
   * failure later in the order rolls the reservation back.
   */
  reserveBatchStock: (
    productId: string,
    startTime: string,
    qty: number,
    maxSold: number,
    session?: ClientSession
  ) =>
    ProductModel.findOneAndUpdate(
      {
        _id: productId,
        preOrderBatches: {$elemMatch: {startTime, sold: {$lte: maxSold}}}
      },
      {$inc: {'preOrderBatches.$.sold': qty, stock: -qty}},
      {new: true, session}
    ).exec(),

  /** Atomically drop `qty` from the product total, only if enough remains. */
  decrementStock: (productId: string, qty: number, session?: ClientSession) =>
    ProductModel.findOneAndUpdate(
      {_id: productId, stock: {$gte: qty}},
      {$inc: {stock: -qty}},
      {new: true, session}
    ).exec()
};
