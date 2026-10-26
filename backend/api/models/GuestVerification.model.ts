import mongoose, {Schema} from 'mongoose';

export interface GuestVerificationDocument extends mongoose.Document {
  phoneNumber?: string;
  email?: string;
  verificationCode: string | null;
  verificationExpiry: Date | null;
  verified: boolean;
  verifiedExpiry: Date | null;
  attempts: number;
  resendCount: number;
  lastSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GuestVerificationSchema = new Schema<GuestVerificationDocument>(
  {
    phoneNumber: {type: String},
    email: {type: String, lowercase: true, trim: true},
    verificationCode: {type: String, default: null},
    verificationExpiry: {type: Date, default: null},
    verified: {type: Boolean, default: false},
    verifiedExpiry: {type: Date, default: null},
    attempts: {type: Number, default: 0},
    resendCount: {type: Number, default: 0},
    lastSentAt: {type: Date, default: null}
  },
  {timestamps: true}
);

GuestVerificationSchema.index(
  {phoneNumber: 1},
  {unique: true, partialFilterExpression: {phoneNumber: {$type: 'string'}}}
);
GuestVerificationSchema.index(
  {email: 1},
  {unique: true, partialFilterExpression: {email: {$type: 'string'}}}
);

export const GuestVerificationModel =
  mongoose.model<GuestVerificationDocument>(
    'GuestVerification',
    GuestVerificationSchema,
    'guest_verifications'
  );

// Drop legacy non-partial unique indexes left over from earlier schema versions.
void GuestVerificationModel.syncIndexes().catch(() => {});