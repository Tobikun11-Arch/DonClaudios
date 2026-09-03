import mongoose from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

export interface CashierDocument extends BaseUserDocument {
  isOnline: boolean;
  username: string;
  profilePhoto?: string;
}

const CashierSchema = createBaseUserSchema<CashierDocument>();

CashierSchema.add({
  username: {type: String, required: true, unique: true, trim: true},
  isOnline: {type: Boolean, default: false},
  profilePhoto: {type: String}
});

export const CashierModel = mongoose.model<CashierDocument>(
  'Cashier',
  CashierSchema,
  'cashiers'
);
