import mongoose, {Schema} from 'mongoose';

export interface PushSubscriptionDocument extends mongoose.Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: mongoose.Types.ObjectId | null;
  userType?: 'customer' | 'admin' | 'cashier' | null;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<PushSubscriptionDocument>(
  {
    endpoint: {type: String, required: true, unique: true},
    keys: {
      p256dh: {type: String, required: true},
      auth: {type: String, required: true}
    },
    userId: {type: Schema.Types.ObjectId, default: null},
    userType: {
      type: String,
      enum: ['customer', 'admin', 'cashier', null],
      default: null
    }
  },
  {timestamps: true}
);

PushSubscriptionSchema.index({userId: 1, userType: 1});

export const PushSubscriptionModel = mongoose.model<PushSubscriptionDocument>(
  'PushSubscription',
  PushSubscriptionSchema,
  'push_subscriptions'
);
