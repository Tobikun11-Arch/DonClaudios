import mongoose, {Schema} from 'mongoose';

export interface GuestVerificationDocument extends mongoose.Document {
  phoneNumber: string;
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
    phoneNumber: {type: String, required: true, unique: true},
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

export const GuestVerificationModel =
  mongoose.model<GuestVerificationDocument>(
    'GuestVerification',
    GuestVerificationSchema,
    'guest_verifications'
  );