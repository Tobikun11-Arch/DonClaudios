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
  openingTime?: string;
  closingTime?: string;
  advanceCloseMinutes?: number;
  closedDays?: number[];
  defaultPrepMinutes?: number;
  isManuallyClosed?: boolean;
  isManuallyOpen?: boolean;
}

const BaseSchema = createBaseUserSchema<AdminDocument>();

const AdminSchema = new Schema<AdminDocument>(
  {
    ...BaseSchema.obj,
    username: {type: String, unique: true, sparse: true},
    profilePhoto: {type: String},
    businessName: {type: String, default: "DonClaudio's Lechon House"},
    businessLogo: {type: String},
    storeAddress: {type: String},
    businessContactNumber: {type: String},
    operatingHours: {type: String},
    businessType: {type: String},
    openingTime: {type: String, default: '08:00'},
    closingTime: {type: String, default: '22:00'},
    advanceCloseMinutes: {type: Number, default: 30, min: 5, max: 60},
    closedDays: {type: [Number], default: [1]},
    defaultPrepMinutes: {type: Number, default: 20, min: 1, max: 1440},
    isManuallyClosed: {type: Boolean, default: false},
    isManuallyOpen: {type: Boolean, default: false},
  },
  {timestamps: true}
);

export const AdminModel = mongoose.model<AdminDocument>(
  'Admin',
  AdminSchema,
  'admins'
);
