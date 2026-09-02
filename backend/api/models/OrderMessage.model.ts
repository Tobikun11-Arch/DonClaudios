import mongoose, {Schema} from 'mongoose';

export type OrderMessageAuthorType = 'customer' | 'admin';

export interface OrderMessageDocument extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId | null;
  adminId?: mongoose.Types.ObjectId | null;
  authorType: OrderMessageAuthorType;
  senderName: string;
  body: string;
  createdAt: Date;
}

const OrderMessageSchema = new Schema<OrderMessageDocument>(
  {
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    customerId: {type: Schema.Types.ObjectId, ref: 'Customer', default: null},
    adminId: {type: Schema.Types.ObjectId, ref: 'Admin', default: null},
    authorType: {
      type: String,
      enum: ['customer', 'admin'],
      required: true
    },
    senderName: {type: String, required: true, trim: true},
    body: {type: String, required: true, trim: true},
    createdAt: {type: Date, default: Date.now}
  },
  {timestamps: false}
);

OrderMessageSchema.index({orderId: 1, createdAt: 1});

export const OrderMessageModel = mongoose.model<OrderMessageDocument>(
  'OrderMessage',
  OrderMessageSchema,
  'ordermessages'
);
