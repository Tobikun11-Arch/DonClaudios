import mongoose from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

export interface CashierDocument extends BaseUserDocument {
  username: string;
  /** Last heartbeat from a cashier app; null after sign-out. See utils/presence. */
  lastSeenAt?: Date | null;
  profilePhoto?: string;
  /** Owner turned the account off: no sign-in, every session rejected. History is kept. */
  isDisabled: boolean;
  disabledAt?: Date | null;
}

const CashierSchema = createBaseUserSchema<CashierDocument>();

CashierSchema.add({
  username: {type: String, required: true, unique: true, trim: true},
  lastSeenAt: {type: Date, default: null},
  isDisabled: {type: Boolean, default: false},
  disabledAt: {type: Date, default: null},
  profilePhoto: {type: String}
});

export const CashierModel = mongoose.model<CashierDocument>(
  'Cashier',
  CashierSchema,
  'cashiers'
);
