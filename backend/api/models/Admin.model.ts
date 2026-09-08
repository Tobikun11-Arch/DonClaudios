import mongoose, {Schema} from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

export interface AdminDocument extends BaseUserDocument {
  username?: string;
  profilePhoto?: string;
  businessName?: string;
  businessLogo?: string;
  storeAddress?: string;
  businessContactNumber?: string;
  operatingHours?: string;
  businessType?: string;
  closingTime?: string;
  advanceCloseMinutes?: number;
  isManuallyClosed?: boolean;
  manualCloseReason?: string;
}

const BaseSchema = createBaseUserSchema<AdminDocument>();

const AdminSchema = new Schema<AdminDocument>(
  {
    ...BaseSchema.obj,
    username: {type: String, unique: true, sparse: true},
    profilePhoto: {type: String},
    businessName: {type: String},
    businessLogo: {type: String},
    storeAddress: {type: String},
    businessContactNumber: {type: String},
    operatingHours: {type: String},
    businessType: {type: String},
    closingTime: {type: String, default: '22:00'},
    advanceCloseMinutes: {type: Number, default: 30, min: 5, max: 60},
    isManuallyClosed: {type: Boolean, default: false},
    manualCloseReason: {type: String, default: ''}
  },
  {timestamps: true}
);

export const AdminModel = mongoose.model<AdminDocument>(
  'Admin',
  AdminSchema,
  'admins'
);
