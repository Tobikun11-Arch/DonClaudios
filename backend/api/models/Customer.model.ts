import mongoose, {Schema} from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';
import {AcquisitionSchema} from './base/Acquisition.schema';
import {mfaField, type AccountMfa} from './base/Mfa.schema';
import type {Acquisition} from '../config/acquisition';

export interface CustomerAddress {
  _id?: string;
  label: string;
  line: string;
  landmark?: string;
  riderNotes?: string;
  isDefault?: boolean;
}

export interface CustomerPreferences {
  defaultFulfillment?: 'pickup' | 'delivery';
  preferredLeadTimeDays?: number;
  servingStyle?: 'whole' | 'chopped' | 'plated';
  sauceCount?: number;
}

export interface CustomerOccasion {
  _id?: string;
  label: string;
  date: Date;
}

export interface CustomerDocument extends BaseUserDocument {
  profilePhoto?: string;
  points: number;
  addresses?: CustomerAddress[];
  preferences?: CustomerPreferences;
  occasions?: CustomerOccasion[];
  /** When the first-login dashboard guide was finished or skipped. */
  onboardingTourDoneAt?: Date | null;
  onboardingTourOutcome?: 'completed' | 'skipped' | null;
  /** Where the customer came from. Absent for accounts made before tracking. */
  acquisition?: Acquisition | null;
  /** Email me when my order is ready / on the way / cancelled. Default on. */
  orderEmailUpdates?: boolean;
  /** Newsletter (new products, promos, pre-orders). Opt-in only, default off. */
  newsletterOptIn?: boolean;
  /** When the newsletter choice was last changed (consent record). */
  newsletterOptInAt?: Date | null;
  /** Google account linked for "Continue with Google" (the Google `sub`). */
  googleId?: string | null;
  googleEmail?: string | null;
  /** How the account was created. Google accounts must verify a phone to order. */
  signupMethod?: 'password' | 'google';
  /** Smart/TNT numbers get no SMS: the number is confirmed by the (Google-verified) email instead. */
  phoneConfirmedByEmail?: boolean;
  /** Optional two-step sign-in (a code sent by email). */
  mfa?: AccountMfa | null;
  /** Last placed online order; claimed atomically for the order cooldown. */
  lastOrderAt?: Date | null;
  /** Temporary spam block: new orders are refused until this moment. */
  orderBlockedUntil?: Date | null;
  /** When the account was last auto-flagged for order spam. */
  flaggedForSpamAt?: Date | null;
}

const BaseSchema = createBaseUserSchema<CustomerDocument>();

const AddressSchema = new Schema<CustomerAddress>(
  {
    label: {type: String, required: true, trim: true},
    line: {type: String, required: true, trim: true},
    landmark: {type: String, trim: true},
    riderNotes: {type: String, trim: true},
    isDefault: {type: Boolean, default: false}
  },
  {_id: true}
);

const OccasionSchema = new Schema<CustomerOccasion>(
  {
    label: {type: String, required: true, trim: true},
    date: {type: Date, required: true}
  },
  {_id: true}
);

const CustomerSchema = new Schema<CustomerDocument>(
  {
    ...BaseSchema.obj,
    // Google-only accounts have no password until they set one.
    passwordHash: {type: String, default: null},
    profilePhoto: {type: String},
    points: {type: Number, default: 0, min: 0},
    addresses: {type: [AddressSchema], default: []},
    preferences: {
      defaultFulfillment: {
        type: String,
        enum: ['pickup', 'delivery']
      },
      preferredLeadTimeDays: {type: Number, min: 0},
      servingStyle: {
        type: String,
        enum: ['whole', 'chopped', 'plated']
      },
      sauceCount: {type: Number, min: 0}
    },
    occasions: {type: [OccasionSchema], default: []},
    acquisition: {type: AcquisitionSchema, default: undefined},
    orderEmailUpdates: {type: Boolean, default: true},
    newsletterOptIn: {type: Boolean, default: false},
    newsletterOptInAt: {type: Date, default: null},
    googleId: {type: String, default: undefined},
    googleEmail: {type: String, default: null},
    signupMethod: {type: String, enum: ['password', 'google'], default: 'password'},
    phoneConfirmedByEmail: {type: Boolean, default: false},
    mfa: mfaField,
    lastOrderAt: {type: Date, default: null},
    orderBlockedUntil: {type: Date, default: null},
    flaggedForSpamAt: {type: Date, default: null},
    onboardingTourDoneAt: {type: Date, default: null},
    onboardingTourOutcome: {
      type: String,
      enum: ['completed', 'skipped', null],
      default: null
    }
  },
  {timestamps: true}
);

CustomerSchema.index({googleId: 1}, {unique: true, sparse: true});

export const CustomerModel = mongoose.model<CustomerDocument>(
  'Customer',
  CustomerSchema,
  'customers'
);
