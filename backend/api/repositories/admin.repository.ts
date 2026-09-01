import {AdminModel, AdminDocument} from '../models/Admin.model';

export const adminRepository = {
  findByEmail: (email: string) =>
    AdminModel.findOne({email: email.toLowerCase()}).exec(),

  findByEmailOrPhoneNumber: (identifier: string) =>
    AdminModel.findOne({
      $or: [{email: identifier.toLowerCase()}, {phoneNumber: identifier}]
    }).exec(),

  findById: (id: string) => AdminModel.findById(id).exec(),

  listAll: () => AdminModel.find({}).exec(),

  create: (data: Partial<AdminDocument>) => AdminModel.create(data)
};
