import {TransactionModel, TransactionDocument} from '../models/Transaction.model';

export const transactionRepository = {
  findById: (id: string) => TransactionModel.findById(id).exec(),

  findByOrderId: (orderId: string) => TransactionModel.findOne({orderId}).exec(),

  listByOrderIds: (orderIds: string[]) =>
    TransactionModel.find({orderId: {$in: orderIds}}).exec(),

  listByCashierId: (cashierId: string) =>
    TransactionModel.find({cashierId}).sort({timestamp: -1}).exec(),

  create: (data: Partial<TransactionDocument>) => TransactionModel.create(data)
};
