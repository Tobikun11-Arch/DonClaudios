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

/**
 * Manual payment flow: the customer claims what they paid (down payment or
 * full) AFTER the cashier confirms the order, and the cashier verifies it
 * before the kitchen starts. Nothing here touches the actual money — it
 * records the agreed arrangement.
 *   unpaid       -> no claim submitted yet
 *   down_payment -> customer claims the agreed partial payment (pre-order only)
 *   paid         -> customer claims the full amount
 */
export type PaymentStatus = 'unpaid' | 'down_payment' | 'paid';

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
  /**
   * Set once the points from `pointsAwarded` have been clawed back because a
   * completed order was cancelled. Doubles as an idempotency latch so a
   * repeated cancel cannot deduct the same points twice.
   */
  pointsReversed?: boolean;
  /** Customer's manual-payment claim ('unpaid' | 'down_payment' | 'paid'). */
  paymentStatus?: PaymentStatus;
  /** Cashier confirmed the customer's claim. Distinguishes claim from trust. */
  paymentVerified?: boolean;
  /** Screenshot the customer uploaded as proof of payment. */
  paymentProofUrl?: string | null;
  /** Free-text the customer attached to the submission (negotiated details). */
  paymentNote?: string | null;
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
    pointsReversed: {type: Boolean, default: false},
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'down_payment', 'paid'],
      default: 'unpaid'
    },
    paymentVerified: {type: Boolean, default: false},
    paymentProofUrl: {type: String, default: null},
    paymentNote: {type: String, default: null},
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
