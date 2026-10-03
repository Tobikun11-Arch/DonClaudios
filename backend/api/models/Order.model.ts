import mongoose, {Schema} from 'mongoose';

export type OrderType = 'pickup' | 'delivery' | 'reservation';
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'completed'
  | 'cancelled';

/**
   pending → order placed
   confirmed → accepted
   preparing → being made
   ready → finished, waiting for pickup (counter orders only)
   on_the_way → courier picked it up (delivery only)
   completed → delivered 
   cancelled → stopped
     */

export interface GuestInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address?: string;
  email?: string;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  at: Date;
}

export interface OrderDocument extends mongoose.Document {
  customerId?: mongoose.Types.ObjectId | null;
  isGuest: boolean;
  guestInfo?: GuestInfo;
  orderType: OrderType;
  orderSource: 'online' | 'in-store';
  totalAmount: number;
  deliveryFee: number;
  riderNotes?: string;
  changeFor?: string;
  cancelReason?: string;
  orderStatus: OrderStatus;
  statusHistory: OrderStatusEntry[];
  estimatedPrepMinutes?: number | null;
  estimatedReadyAt?: Date | null;
  overdueNotifiedAt?: Date | null;
  isOnline: boolean;
  stockDeducted: boolean;
  /**
   * Loyalty points credited when this order was completed, or null if it has
   * not been credited yet. Doubles as an idempotency latch so re-sending
   * `completed` cannot award the same points twice.
   */
  pointsAwarded?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const GuestInfoSchema = new Schema<GuestInfo>(
  {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    phoneNumber: {type: String, required: true},
    address: {type: String},
    email: {type: String}
  },
  {_id: false}
);

const OrderStatusEntrySchema = new Schema<OrderStatusEntry>(
  {
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'on_the_way',
        'completed',
        'cancelled'
      ],
      required: true
    },
    at: {type: Date, required: true, default: Date.now}
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
      enum: ['pickup', 'delivery', 'reservation'],
      required: true
    },
    orderSource: {
      type: String,
      enum: ['online', 'in-store'],
      default: 'online'
    },
    totalAmount: {type: Number, required: true},
    deliveryFee: {type: Number, default: 0},
    riderNotes: {type: String},
    changeFor: {type: String},
    cancelReason: {type: String},
    orderStatus: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'on_the_way',
        'completed',
        'cancelled'
      ],
      default: 'pending'
    },
    statusHistory: {type: [OrderStatusEntrySchema], default: []},
    estimatedPrepMinutes: {type: Number, default: null},
    estimatedReadyAt: {type: Date, default: null},
    overdueNotifiedAt: {type: Date, default: null},
    stockDeducted: {type: Boolean, default: false},
    pointsAwarded: {type: Number, default: null},
    isOnline: {type: Boolean, default: true}
  },
  {timestamps: true}
);

OrderSchema.index({customerId: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, overdueNotifiedAt: 1});
OrderSchema.index({orderSource: 1, createdAt: -1});
OrderSchema.index({orderType: 1, createdAt: -1});

export const OrderModel = mongoose.model<OrderDocument>(
  'Order',
  OrderSchema,
  'orders'
);
