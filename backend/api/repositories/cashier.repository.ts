import {CashierModel, CashierDocument} from '../models/Cashier.model';

export const cashierRepository = {
  findByEmail: (email: string) =>
    CashierModel.findOne({email: email.toLowerCase()}).exec(),

  findByUsername: (username: string) =>
    CashierModel.findOne({username: username.trim()}).exec(),

  findByEmailOrPhoneNumber: (identifier: string) =>
    CashierModel.findOne({
      $or: [{email: identifier.toLowerCase()}, {phoneNumber: identifier}]
    }).exec(),

  findById: (id: string) => CashierModel.findById(id).exec(),

  findSafeById: (id: string) =>
    CashierModel.findById(id)
      .select('-passwordHash -verificationCode -verificationExpiry')
      .exec(),

  list: () =>
    CashierModel.find({})
      .select('-passwordHash -verificationCode -verificationExpiry')
      .sort({createdAt: -1})
      .exec(),

  create: (data: Partial<CashierDocument>) => CashierModel.create(data),

  updateById: (id: string, data: Partial<CashierDocument>) =>
    CashierModel.findByIdAndUpdate(id, data, {new: true})
      .select('-passwordHash -verificationCode -verificationExpiry')
      .exec(),

  deleteById: (id: string) => CashierModel.findByIdAndDelete(id).exec()
};
