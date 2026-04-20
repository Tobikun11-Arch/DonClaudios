import { UserModel } from '../models/User.model';
export const userRepository = {
    findByEmail: (email) => UserModel.findOne({ email: email.toLowerCase() }).exec(),
    findById: (id) => UserModel.findById(id).exec(),
    listByType: (type) => UserModel.find({ type }).exec(),
    listAll: () => UserModel.find({}).exec(),
    create: (data) => UserModel.create(data),
    updateProfile: (customerId, data) => UserModel.updateOne({ _id: customerId }, data).exec(),
    setVerificationCode: (email, code, expiry) => UserModel.updateOne({ email: email.toLowerCase() }, { verificationCode: code, verificationExpiry: expiry }).exec(),
    clearVerificationCode: (email) => UserModel.updateOne({ email: email.toLowerCase() }, { verificationCode: null, verificationExpiry: null }).exec(),
    markVerified: (email) => UserModel.updateOne({ email: email.toLowerCase() }, { isVerified: true, verificationCode: null, verificationExpiry: null }).exec(),
    updateType: (customerId, type) => UserModel.updateOne({ _id: customerId }, { type }).exec()
};
