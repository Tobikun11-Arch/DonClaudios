import mongoose, {Schema} from 'mongoose';

export type NotificationType = 'review_reply' | 'review_submitted' | 'low_stock';
export type NotificationTarget = 'customer' | 'admin';

export interface NotificationDocument extends mongoose.Document {
  target: NotificationTarget;
  customerId?: mongoose.Types.ObjectId | null;
  adminId?: mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  reviewId?: mongoose.Types.ObjectId | null;
  link?: string | null;
  read: boolean;
  readAt?: Date | null;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    target: {
      type: String,
      enum: ['customer', 'admin'],
      required: true
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    type: {
      type: String,
      enum: ['review_reply', 'review_submitted', 'low_stock'],
      required: true
    },
    title: {type: String, required: true},
    message: {type: String, required: true},
    reviewId: {type: Schema.Types.ObjectId, ref: 'Review', default: null},
    link: {type: String, default: null},
    read: {type: Boolean, default: false},
    readAt: {type: Date, default: null}
  },
  {timestamps: true}
);

NotificationSchema.index({target: 1, customerId: 1, read: 1});
NotificationSchema.index({target: 1, adminId: 1, read: 1});
NotificationSchema.index({createdAt: -1});

export const NotificationModel = mongoose.model<NotificationDocument>(
  'Notification',
  NotificationSchema,
  'notifications'
);
