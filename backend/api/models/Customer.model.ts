import mongoose from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

export interface CustomerDocument extends BaseUserDocument {}

const CustomerSchema = createBaseUserSchema<CustomerDocument>();

export const CustomerModel = mongoose.model<CustomerDocument>(
  'Customer',
  CustomerSchema,
  'customers'
);
