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

  findByEmail: (email: string) =>
    GuestVerificationModel.findOne({email: email.toLowerCase().trim()}).exec(),

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
    ).exec(),

  upsertEmailCode: (email: string, code: string, expiry: Date) =>
    GuestVerificationModel.findOneAndUpdate(
      {email: email.toLowerCase().trim()},
      {
        $set: {
          email: email.toLowerCase().trim(),
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

  incrementEmailAttempts: (email: string) =>
    GuestVerificationModel.updateOne(
      {email: email.toLowerCase().trim()},
      {$inc: {attempts: 1}}
    ).exec(),

  invalidateEmailCode: (email: string) =>
    GuestVerificationModel.updateOne(
      {email: email.toLowerCase().trim()},
      {verificationCode: null, verificationExpiry: null}
    ).exec(),

  markEmailVerified: (email: string, verifiedExpiry: Date) =>
    GuestVerificationModel.findOneAndUpdate(
      {email: email.toLowerCase().trim()},
      {
        $set: {
          email: email.toLowerCase().trim(),
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