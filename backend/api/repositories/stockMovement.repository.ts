import type {ClientSession} from 'mongoose';
import {StockMovementModel, StockMovementDocument} from '../models/StockMovement.model';

export const stockMovementRepository = {
  findByProductId: (productId: string) =>
    StockMovementModel.find({productId})
      .populate('performedBy', 'firstName lastName')
      .sort({createdAt: -1})
      .exec(),

  listAll: () =>
    StockMovementModel.find({})
      .populate('performedBy', 'firstName lastName')
      .populate('productId', 'name')
      .sort({createdAt: -1})
      .exec(),

  create: (data: Partial<StockMovementDocument>, session?: ClientSession) =>
    session
      ? StockMovementModel.create([data], {session}).then(rows => rows[0])
      : StockMovementModel.create(data)
};
