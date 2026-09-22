import {CustomerModel, CustomerDocument} from '../models/Customer.model';
import {phoneVariants} from '../utils/phone';

function matchByIdentifier(identifier: string) {
  return {
    $or: [
      {email: identifier.toLowerCase()},
      {phoneNumber: {$in: phoneVariants(identifier)}}
    ]
  };
}

export const customerRepository = {
  findByEmail: (email: string) =>
    CustomerModel.findOne({email: email.toLowerCase()}).exec(),

  findByPhoneNumber: (phoneNumber: string) =>
    CustomerModel.findOne({phoneNumber: {$in: phoneVariants(phoneNumber)}}).exec(),

  findByEmailOrPhoneNumber: (identifier: string) =>
    CustomerModel.findOne({
      $or: [
        {email: identifier.toLowerCase()},
        {phoneNumber: {$in: phoneVariants(identifier)}}
      ]
    }).exec(),

  findById: (id: string) => CustomerModel.findById(id).exec(),

  listAll: () => CustomerModel.find({}).exec(),

  listByIds: (ids: string[]) =>
    CustomerModel.find({_id: {$in: ids}})
      .select('firstName lastName phoneNumber email')
      .exec(),

  create: (data: Partial<CustomerDocument>) => CustomerModel.create(data),

  addPoints: (customerId: string, points: number) =>
    CustomerModel.updateOne(
      {_id: customerId},
      {$inc: {points}}
    ).exec(),

  subtractPoints: (customerId: string, points: number) =>
    CustomerModel.updateOne(
      {_id: customerId, points: {$gte: points}},
      {$inc: {points: -points}}
    ).exec(),

  updateProfile: (
    customerId: string,
    data: Partial<
      Pick<
        CustomerDocument,
        'firstName' | 'lastName' | 'phoneNumber' | 'address' | 'profilePhoto'
      >
    >
  ) => CustomerModel.updateOne({_id: customerId}, data).exec(),

  deleteById: (id: string) => CustomerModel.findByIdAndDelete(id).exec(),

  setVerificationCode: (identifier: string, code: string, expiry: Date) =>
    CustomerModel.updateOne(
      matchByIdentifier(identifier),
      {verificationCode: code, verificationExpiry: expiry}
    ).exec(),

  clearVerificationCode: (identifier: string) =>
    CustomerModel.updateOne(
      matchByIdentifier(identifier),
      {verificationCode: null, verificationExpiry: null}
    ).exec(),

  markVerified: (identifier: string) =>
    CustomerModel.updateOne(
      matchByIdentifier(identifier),
      {isVerified: true, verificationCode: null, verificationExpiry: null}
    ).exec()
};
