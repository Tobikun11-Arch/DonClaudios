import {
  GuestVerificationModel,
  GuestVerificationDocument
} from '../models/GuestVerification.model';
import {phoneVariants} from '../utils/phone';

export const guestVerificationRepository = {
  findByPhone: (phoneNumber: string) =>
    GuestVerificationModel.findOne({
      phoneNumber: {$in: phoneVariants(phoneNumber)}
    }).exec(),

  upsertCode: (phoneNumber: string, code: string, expiry: Date) =>
    GuestVerificationModel.findOneAndUpdate(
      {phoneNumber},
      {
        $set: {
          phoneNumber,
          verificationCode: code,
          verificationExpiry: expiry,
          verified: false,
          verifiedExpiry: null,
          attempts: 0,
          lastSentAt: new Date()
        },
        $inc: {resendCount: 1}
      },
      {upsert: true, new: true, setDefaultsOnInsert: true}
    ).exec(),

  incrementAttempts: (phoneNumber: string) =>
    GuestVerificationModel.updateOne(
      {phoneNumber},
      {$inc: {attempts: 1}}
    ).exec(),

  invalidateCode: (phoneNumber: string) =>
    GuestVerificationModel.updateOne(
      {phoneNumber},
      {verificationCode: null, verificationExpiry: null}
    ).exec(),

  markVerified: (phoneNumber: string, verifiedExpiry: Date) =>
    GuestVerificationModel.findOneAndUpdate(
      {phoneNumber},
      {
        $set: {
          phoneNumber,
          verified: true,
          verifiedExpiry,
          verificationCode: null,
          verificationExpiry: null
        }
      },
      {upsert: true, new: true, setDefaultsOnInsert: true}
    ).exec()
};

export type GuestVerificationDocumentType = GuestVerificationDocument;