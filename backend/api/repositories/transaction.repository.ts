import type {ClientSession} from 'mongoose';
import {TransactionModel, TransactionDocument} from '../models/Transaction.model';

export const transactionRepository = {
  findById: (id: string) => TransactionModel.findById(id).exec(),

  findByOrderId: (orderId: string) => TransactionModel.findOne({orderId}).exec(),

  listByOrderIds: (orderIds: string[]) =>
    TransactionModel.find({orderId: {$in: orderIds}}).exec(),

  /** Lean orderId + paymentMethod pairs, for the polled order list endpoints. */
  listPaymentMethodsByOrderIds: (orderIds: string[]) =>
    TransactionModel.find({orderId: {$in: orderIds}})
      .select('orderId paymentMethod')
      .lean()
      .exec(),

  listByCashierId: (cashierId: string) =>
    TransactionModel.find({cashierId}).sort({timestamp: -1}).exec(),

  create: (data: Partial<TransactionDocument>, session?: ClientSession) =>
    session
      ? TransactionModel.create([data], {session}).then(rows => rows[0])
      : TransactionModel.create(data),

  /** Orders keyed uniquely by orderId (unique index in the model). */
  updateByOrderId: (orderId: string, data: Partial<TransactionDocument>) =>
    TransactionModel.findOneAndUpdate({orderId}, data, {new: true}).exec()
};
