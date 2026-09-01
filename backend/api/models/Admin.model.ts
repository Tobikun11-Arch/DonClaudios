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
    businessType: {type: String}
  },
  {timestamps: true}
);

export const AdminModel = mongoose.model<AdminDocument>(
  'Admin',
  AdminSchema,
  'admins'
);
