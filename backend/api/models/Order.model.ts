import mongoose, {Schema} from 'mongoose';

export type OrderType = 'pickup' | 'delivery' | 'reservation';
export type DeliveryMode = 'DONCLAUDIO' | 'LALAMOVE';
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
  phoneNumber?: string;
  address?: string;
  email?: string;
}

export interface OrderStatusEntry {
  status: OrderStatus;
  at: Date;
}

/**
 * Payment summary of an online order (the Xendit `payments` collection holds
 * the per-invoice detail).
 *   unpaid       -> nothing paid yet
 *   down_payment -> the 50% down payment of a pre-order cart is paid
 *   paid         -> the whole order total is paid (online or cash received)
 */
export type PaymentStatus = 'unpaid' | 'down_payment' | 'paid';

/** How the customer chose to pay once the cashier confirmed the order. */
export type PaymentChoice =
  | 'online_full'
  | 'online_down_payment'
  | 'cash_on_pickup';

/** How the customer settles the rest after a down payment. */
export type BalanceChoice = 'cash' | 'online';

export type RefundStatus = 'none' | 'pending' | 'refunded' | 'failed';

export type OrderPaymentMethod =
  | 'cash'
  | 'card'
  | 'gcash'
  | 'maya'
  | 'grabpay'
  | 'shopeepay'
  | 'other';

export interface OrderDocument extends mongoose.Document {
  customerId?: mongoose.Types.ObjectId | null;
  sizeKg?: number | null;
  occasionId?: string | null;
  isGuest: boolean;
  guestInfo?: GuestInfo;
  orderType: OrderType;
  deliveryMode?: DeliveryMode;
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
  paymentStatus?: PaymentStatus;
  paymentChoice?: PaymentChoice | null;
  balanceChoice?: BalanceChoice | null;
  /** Order amount settled so far (excludes transaction fees). */
  amountPaid?: number;
  /** Xendit fees paid by the customer on top of the order (not revenue). */
  transactionFee?: number;
  /** Channel of the last online payment, e.g. 'gcash'. */
  paymentChannel?: string | null;
  /** When the open Xendit invoice expires (drives the UI countdown). */
  paymentExpiresAt?: Date | null;
  refundStatus?: RefundStatus;
  /**
   * How the order was paid: cash at the counter / on pickup, or the online
   * channel reported by Xendit.
   */
  paymentMethod?: OrderPaymentMethod;
  /**
   * Walk-in (in-store) order number, e.g. "DC-001". Generated on the backend
   * when a counter order is created. Separate from the Mongo _id so the UI can
   * show a stable, human-friendly reference.
   */
  orderNumber?: string;
  /** Timestamp the walk-in order was marked as paid. */
  paidAt?: Date | null;
  /** Cashier/admin id that marked the walk-in order as paid. */
  paidBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const GuestInfoSchema = new Schema<GuestInfo>(
  {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    phoneNumber: {type: String},
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
    sizeKg: {type: Number, min: 0, default: null},
    occasionId: {type: String, default: null},
    isGuest: {type: Boolean, required: true},
    guestInfo: {type: GuestInfoSchema},
    orderType: {
      type: String,
      enum: ['pickup', 'delivery', 'reservation'],
      required: true
    },
    deliveryMode: {
      type: String,
      enum: ['DONCLAUDIO', 'LALAMOVE'],
      default: 'LALAMOVE'
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
    paymentChoice: {
      type: String,
      enum: ['online_full', 'online_down_payment', 'cash_on_pickup', null],
      default: null
    },
    balanceChoice: {
      type: String,
      enum: ['cash', 'online', null],
      default: null
    },
    amountPaid: {type: Number, default: 0},
    transactionFee: {type: Number, default: 0},
    paymentChannel: {type: String, default: null},
    paymentExpiresAt: {type: Date, default: null},
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'refunded', 'failed'],
      default: 'none'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'gcash', 'maya', 'grabpay', 'shopeepay', 'other', null],
      default: null
    },
    orderNumber: {type: String},
    paidAt: {type: Date, default: null},
    paidBy: {type: String, default: null},
    isOnline: {type: Boolean, default: true}
  },
  {timestamps: true}
);

OrderSchema.index({customerId: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, overdueNotifiedAt: 1});
OrderSchema.index({orderSource: 1, createdAt: -1});
OrderSchema.index({orderNumber: 1}, {unique: true, sparse: true});
OrderSchema.index({orderType: 1, createdAt: -1});

export const OrderModel = mongoose.model<OrderDocument>(
  'Order',
  OrderSchema,
  'orders'
);
