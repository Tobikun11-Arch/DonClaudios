import mongoose, {Schema} from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

export interface CustomerDocument extends BaseUserDocument {
  profilePhoto?: string;
  points: number;
}

const BaseSchema = createBaseUserSchema<CustomerDocument>();

const CustomerSchema = new Schema<CustomerDocument>(
  {
    ...BaseSchema.obj,
    profilePhoto: {type: String},
    points: {type: Number, default: 0, min: 0}
  },
  {timestamps: true}
);

export const CustomerModel = mongoose.model<CustomerDocument>(
  'Customer',
  CustomerSchema,
  'customers'
);
