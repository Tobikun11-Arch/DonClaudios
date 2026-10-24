import mongoose, {Schema} from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

export interface NotificationPreferences {
  account?: {
    'New login'?: boolean;
    'Password change'?: boolean;
  };
  reports?: {
    'Daily sales summary'?: boolean;
    'High cancellation rate'?: boolean;
    'Kitchen prep times missing'?: boolean;
  };
  customers?: {
    'New reviews'?: boolean;
    'Flagged reviews'?: boolean;
    'Customer replies'?: boolean;
    'New chat messages'?: boolean;
    'New sign-ups'?: boolean;
  };
  inventory?: {
    'Low stock alerts'?: boolean;
    'Out of stock'?: boolean;
    'Spoilage / large adjustments'?: boolean;
  };
  preorders?: {
    'Pre-order batch almost full'?: boolean;
    'Pre-order batch sold out'?: boolean;
    'Pre-order window closed'?: boolean;
  };
}

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
  notificationPreferences?: NotificationPreferences;
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
    notificationPreferences: {
      type: {
        account: {
          type: {
            'New login': {type: Boolean, default: true},
            'Password change': {type: Boolean, default: true}
          },
          default: undefined
        },
        reports: {
          type: {
            'Daily sales summary': {type: Boolean, default: false},
            'High cancellation rate': {type: Boolean, default: false},
            'Kitchen prep times missing': {type: Boolean, default: false}
          },
          default: undefined
        },
        customers: {
          type: {
            'New reviews': {type: Boolean, default: true},
            'Flagged reviews': {type: Boolean, default: true},
            'Customer replies': {type: Boolean, default: true},
            'New chat messages': {type: Boolean, default: true},
            'New sign-ups': {type: Boolean, default: false}
          },
          default: undefined
        },
        inventory: {
          type: {
            'Low stock alerts': {type: Boolean, default: true},
            'Out of stock': {type: Boolean, default: true},
            'Spoilage / large adjustments': {type: Boolean, default: false}
          },
          default: undefined
        },
        preorders: {
          type: {
            'Pre-order batch almost full': {type: Boolean, default: true},
            'Pre-order batch sold out': {type: Boolean, default: true},
            'Pre-order window closed': {type: Boolean, default: false}
          },
          default: undefined
        }
      },
      default: undefined
    }
  },
  {timestamps: true}
);

export const AdminModel = mongoose.model<AdminDocument>(
  'Admin',
  AdminSchema,
  'admins'
);
