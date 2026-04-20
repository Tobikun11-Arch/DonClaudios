import {CustomerModel, CustomerDocument} from '../models/Customer.model';

export const customerRepository = {
  findByEmail: (email: string) =>
    CustomerModel.findOne({email: email.toLowerCase()}).exec(),

  findByEmailOrPhoneNumber: (identifier: string) =>
    CustomerModel.findOne({
      $or: [{email: identifier.toLowerCase()}, {phoneNumber: identifier}]
    }).exec(),

  findById: (id: string) => CustomerModel.findById(id).exec(),

  listAll: () => CustomerModel.find({}).exec(),

  create: (data: Partial<CustomerDocument>) => CustomerModel.create(data),

  updateProfile: (
    customerId: string,
    data: Partial<
      Pick<CustomerDocument, 'firstName' | 'lastName' | 'phoneNumber' | 'address'>
    >
  ) => CustomerModel.updateOne({_id: customerId}, data).exec(),

  setVerificationCode: (email: string, code: string, expiry: Date) =>
    CustomerModel.updateOne(
      {email: email.toLowerCase()},
      {verificationCode: code, verificationExpiry: expiry}
    ).exec(),

  clearVerificationCode: (email: string) =>
    CustomerModel.updateOne(
      {email: email.toLowerCase()},
      {verificationCode: null, verificationExpiry: null}
    ).exec(),

  markVerified: (email: string) =>
    CustomerModel.updateOne(
      {email: email.toLowerCase()},
      {isVerified: true, verificationCode: null, verificationExpiry: null}
    ).exec()
};
