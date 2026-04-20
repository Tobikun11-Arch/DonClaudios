import mongoose, {Schema} from 'mongoose';

export type OrderType = 'pickup' | 'delivery' | 'dine_in';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface GuestInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address?: string;
}

export interface OrderDocument extends mongoose.Document {
  customerId?: mongoose.Types.ObjectId | null;
  isGuest: boolean;
  guestInfo?: GuestInfo;
  orderType: OrderType;
  totalAmount: number;
  orderStatus: OrderStatus;
  isOnline: boolean;
}

const GuestInfoSchema = new Schema<GuestInfo>(
  {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    address: {type: String}
  },
  {_id: false}
);

const OrderSchema = new Schema<OrderDocument>(
  {
    customerId: {type: Schema.Types.ObjectId, ref: 'Customer', default: null},
    isGuest: {type: Boolean, required: true},
    guestInfo: {type: GuestInfoSchema},
    orderType: {
      type: String,
      enum: ['pickup', 'delivery', 'dine_in'],
      required: true
    },
    totalAmount: {type: Number, required: true},
    orderStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending'
    },
    isOnline: {type: Boolean, default: true}
  },
  {timestamps: true}
);

OrderSchema.index({customerId: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, createdAt: -1});

export const OrderModel = mongoose.model<OrderDocument>('Order', OrderSchema, 'orders');
