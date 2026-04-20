import mongoose, {Schema} from 'mongoose';

export interface BaseUserDocument extends mongoose.Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  address?: string;
  isVerified: boolean;
  verificationCode?: string | null;
  verificationExpiry?: Date | null;
}

export function createBaseUserSchema<T extends BaseUserDocument>() {
  const schema = new Schema<T>(
    {
      firstName: {type: String, required: true},
      lastName: {type: String, required: true},
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
      },
      passwordHash: {type: String, required: true},
      phoneNumber: {type: String},
      address: {type: String},
      isVerified: {type: Boolean, default: false},
      verificationCode: {type: String, default: null},
      verificationExpiry: {type: Date, default: null}
    },
    {timestamps: true}
  );

  schema.index({phoneNumber: 1}, {unique: true, sparse: true});

  return schema;
}
