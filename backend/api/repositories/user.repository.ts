import {UserModel, UserDocument, UserType} from '../models/User.model';

export const userRepository = {
  findByEmail: (email: string) =>
    UserModel.findOne({email: email.toLowerCase()}).exec(),

  findById: (id: string) => UserModel.findById(id).exec(),

  listByType: (type: UserType) => UserModel.find({type}).exec(),

  listAll: () => UserModel.find({}).exec(),

  create: (data: Partial<UserDocument>) => UserModel.create(data),

  updateProfile: (
    customerId: string,
    data: Partial<
      Pick<UserDocument, 'firstName' | 'lastName' | 'phoneNumber' | 'address'>
    >
  ) => UserModel.updateOne({_id: customerId}, data).exec(),

  setVerificationCode: (email: string, code: string, expiry: Date) =>
    UserModel.updateOne(
      {email: email.toLowerCase()},
      {verificationCode: code, verificationExpiry: expiry}
    ).exec(),

  clearVerificationCode: (email: string) =>
    UserModel.updateOne(
      {email: email.toLowerCase()},
      {verificationCode: null, verificationExpiry: null}
    ).exec(),

  markVerified: (email: string) =>
    UserModel.updateOne(
      {email: email.toLowerCase()},
      {isVerified: true, verificationCode: null, verificationExpiry: null}
    ).exec(),

  updateType: (customerId: string, type: UserType) =>
    UserModel.updateOne({_id: customerId}, {type}).exec()
};
