import mongoose, {Schema} from 'mongoose';

export type StaffActivityAction =
  | 'login'
  | 'logout'
  | 'order_status'
  | 'courier_ack';

/** One thing a cashier (or the owner) did: signed in/out, or moved an order. */
export interface StaffActivityDocument extends mongoose.Document {
  actorId: string;
  actorType: 'cashier' | 'admin';
  actorName?: string | null;
  action: StaffActivityAction;
  orderId?: mongoose.Types.ObjectId | null;
  meta?: Record<string, unknown> | null;
  ip?: string | null;
  client: 'web' | 'mobile';
  at: Date;
}

const StaffActivitySchema = new Schema<StaffActivityDocument>({
  actorId: {type: String, required: true},
  actorType: {type: String, enum: ['cashier', 'admin'], required: true},
  actorName: {type: String, default: null},
  action: {
    type: String,
    enum: ['login', 'logout', 'order_status', 'courier_ack'],
    required: true
  },
  orderId: {type: Schema.Types.ObjectId, ref: 'Order', default: null},
  meta: {type: Schema.Types.Mixed, default: null},
  ip: {type: String, default: null},
  client: {type: String, enum: ['web', 'mobile'], default: 'web'},
  at: {type: Date, default: Date.now}
});

StaffActivitySchema.index({at: -1});
StaffActivitySchema.index({actorId: 1, at: -1});
StaffActivitySchema.index({action: 1, at: -1});

export const StaffActivityModel = mongoose.model<StaffActivityDocument>(
  'StaffActivity',
  StaffActivitySchema,
  'staff_activity'
);
