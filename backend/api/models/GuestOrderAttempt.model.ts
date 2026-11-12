import mongoose, {Schema} from 'mongoose';
import {GUEST_ORDER_GUARD} from '../config/guestOrderGuard';

/**
 * One row per guest checkout attempt (placed or blocked). Stored in MongoDB
 * rather than memory so the limits hold across serverless instances. Rows
 * expire automatically after GUEST_ORDER_GUARD.attemptLogHours.
 */
export type GuestOrderAttemptOutcome = 'placed' | 'blocked';

export interface GuestOrderAttemptDocument extends mongoose.Document {
  ip: string;
  phone: string | null;
  email: string | null;
  itemsHash: string;
  outcome: GuestOrderAttemptOutcome;
  /** Error code when blocked (e.g. GUEST_IP_COOLDOWN). */
  reason: string | null;
  orderId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const GuestOrderAttemptSchema = new Schema<GuestOrderAttemptDocument>(
  {
    ip: {type: String, required: true},
    phone: {type: String, default: null},
    email: {type: String, default: null, lowercase: true, trim: true},
    itemsHash: {type: String, required: true},
    outcome: {type: String, enum: ['placed', 'blocked'], required: true},
    reason: {type: String, default: null},
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', default: null}
  },
  {timestamps: {createdAt: true, updatedAt: false}}
);

GuestOrderAttemptSchema.index({ip: 1, outcome: 1, createdAt: -1});
GuestOrderAttemptSchema.index({phone: 1, outcome: 1, createdAt: -1});
GuestOrderAttemptSchema.index({email: 1, outcome: 1, createdAt: -1});
GuestOrderAttemptSchema.index(
  {createdAt: 1},
  {expireAfterSeconds: GUEST_ORDER_GUARD.attemptLogHours * 60 * 60}
);

export const GuestOrderAttemptModel =
  mongoose.model<GuestOrderAttemptDocument>(
    'GuestOrderAttempt',
    GuestOrderAttemptSchema,
    'guest_order_attempts'
  );
