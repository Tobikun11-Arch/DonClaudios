import mongoose, {Schema} from 'mongoose';
import {BaseUserDocument, createBaseUserSchema} from './base/BaseUser.schema';

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
    occasions: {type: [OccasionSchema], default: []}
  },
  {timestamps: true}
);

export const CustomerModel = mongoose.model<CustomerDocument>(
  'Customer',
  CustomerSchema,
  'customers'
);
