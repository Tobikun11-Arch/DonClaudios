import mongoose, {Schema} from 'mongoose';
import {CUSTOMER_ORDER_GUARD} from '../config/customerOrderGuard';

/**
 * One row per account checkout attempt (placed or blocked), mirroring
 * guest_order_attempts. Used for the duplicate-cart check and to count
 * "strikes" before temporarily blocking an account. Rows expire after
 * CUSTOMER_ORDER_GUARD.attemptLogHours.
 */
export type CustomerOrderAttemptOutcome = 'placed' | 'blocked';

export interface CustomerOrderAttemptDocument extends mongoose.Document {
  customerId: mongoose.Types.ObjectId;
  ip: string;
  itemsHash: string;
  outcome: CustomerOrderAttemptOutcome;
  /** Error code when blocked (e.g. CUSTOMER_ORDER_COOLDOWN). */
  reason: string | null;
  orderId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const CustomerOrderAttemptSchema = new Schema<CustomerOrderAttemptDocument>(
  {
    customerId: {type: Schema.Types.ObjectId, ref: 'Customer', required: true},
    ip: {type: String, required: true},
    itemsHash: {type: String, required: true},
    outcome: {type: String, enum: ['placed', 'blocked'], required: true},
    reason: {type: String, default: null},
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', default: null}
  },
  {timestamps: {createdAt: true, updatedAt: false}}
);

CustomerOrderAttemptSchema.index({customerId: 1, outcome: 1, createdAt: -1});
CustomerOrderAttemptSchema.index(
  {createdAt: 1},
  {expireAfterSeconds: CUSTOMER_ORDER_GUARD.attemptLogHours * 60 * 60}
);

export const CustomerOrderAttemptModel =
  mongoose.model<CustomerOrderAttemptDocument>(
    'CustomerOrderAttempt',
    CustomerOrderAttemptSchema,
    'customer_order_attempts'
  );
