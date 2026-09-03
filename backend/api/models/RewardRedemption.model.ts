import mongoose, {Schema} from 'mongoose';

export interface RewardRedemptionDocument extends mongoose.Document {
  customerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string;
  productImage?: string;
  pointsSpent: number;
  quantity: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const RewardRedemptionSchema = new Schema<RewardRedemptionDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {type: String, required: true, trim: true},
    productImage: {type: String},
    pointsSpent: {type: Number, required: true, min: 1},
    quantity: {type: Number, required: true, min: 1, default: 1},
    status: {
      type: String,
      enum: ['pending', 'fulfilled', 'cancelled'],
      default: 'pending'
    }
  },
  {timestamps: true}
);

RewardRedemptionSchema.index({customerId: 1, createdAt: -1});
RewardRedemptionSchema.index({status: 1});

export const RewardRedemptionModel =
  mongoose.model<RewardRedemptionDocument>(
    'RewardRedemption',
    RewardRedemptionSchema,
    'reward_redemptions'
  );
