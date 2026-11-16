import mongoose, {Schema} from 'mongoose';
import {AcquisitionSchema} from './base/Acquisition.schema';
import type {Acquisition} from '../config/acquisition';

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
  | 'cash_on_pickup'
  /** Cash at the store counter before the deadline in `paymentExpiresAt`. */
  | 'in_store_full'
  | 'in_store_down_payment';

/** How the customer settles the rest after a down payment. */
export type BalanceChoice = 'cash' | 'online' | 'in_store';

export type RefundStatus = 'none' | 'pending' | 'refunded' | 'failed';

/** What the cancellation refund was, per config/refundPolicy.ts. */
export interface OrderRefundInfo {
  policy: 'early' | 'late' | 'store';
  paid: number;
  retained: number;
  onlineTotal: number;
  cash: number;
  feesRefunded: number;
  feesNotRefunded: number;
  refundTotal: number;
  decidedAt: Date;
}

/** Customer asked to cancel a pre-order after its cut-off (owner decides). */
export interface OrderCancelRequest {
  status: 'pending' | 'approved' | 'declined';
  reason?: string | null;
  requestedAt: Date;
  decidedAt?: Date | null;
  decidedBy?: string | null;
  /** Owner's note to the customer (e.g. why it was declined). */
  note?: string | null;
}

export type OrderPaymentMethod =
  | 'cash'
  | 'card'
  | 'gcash'
  | 'maya'
  | 'grabpay'
  | 'shopeepay'
  | 'other';

/** Pickup details of a dated pre-order (see PreOrderEvent). */
export interface OrderPreOrderInfo {
  eventId: mongoose.Types.ObjectId;
  eventTitle: string;
  /** Pickup day (Manila midnight). */
  pickupDate: Date;
  slotId: mongoose.Types.ObjectId;
  slotLabel: string;
  /** Pickup date + slot start: when the order is due. */
  pickupAt: Date;
  receiveMethod: 'pickup' | 'lalamove';
  /** Customers may cancel until this moment. */
  cancelDeadline: Date;
  /** Latch: capacity was given back (cancel/expiry). Prevents double release. */
  released: boolean;
}

export interface OrderDocument extends mongoose.Document {
  customerId?: mongoose.Types.ObjectId | null;
  sizeKg?: number | null;
  occasionId?: string | null;
  isGuest: boolean;
  guestInfo?: GuestInfo;
  orderType: OrderType;
  deliveryMode?: DeliveryMode;
  /** Pinned drop-off for delivery orders (used for the free-delivery zone). */
  deliveryLocation?: {lat: number; lng: number} | null;
  /** Guest orders only: where the guest came from (account orders use the customer's). */
  acquisition?: Acquisition | null;
  /** Courier the customer books themself (self-booked delivery only). */
  courier?: {
    provider: 'lalamove' | 'grab_express' | 'move_it' | 'other';
    name?: string | null;
  } | null;
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
  /** True for dated pre-orders (Holiday pre-orders). */
  isPreOrder?: boolean;
  /** Down payment % in force when the order was placed (snapshot of the owner setting). */
  downPaymentPercent?: number | null;
  preOrder?: OrderPreOrderInfo | null;
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
  /**
   * When the open Xendit invoice expires, or the in-store payment deadline
   * (paymentChoice in_store_*). Drives the UI countdown and auto-cancel.
   */
  paymentExpiresAt?: Date | null;
  refundStatus?: RefundStatus;
  /** Who cancelled the order (drives the refund policy). */
  cancelledBy?: 'customer' | 'store' | 'system' | null;
  refund?: OrderRefundInfo | null;
  /** Cash to hand back at the counter, and when/who handed it back. */
  cashRefundDue?: number;
  cashRefundedAt?: Date | null;
  cashRefundedBy?: string | null;
  cancelRequest?: OrderCancelRequest | null;
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
  /**
   * Id the mobile POS generated for a walk-in sale (possibly made offline).
   * Sent on every retry so a sale that reached the server once is never
   * created twice.
   */
  clientRef?: string;
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
    deliveryLocation: {
      type: new Schema({lat: Number, lng: Number}, {_id: false}),
      default: null
    },
    courier: {
      type: new Schema(
        {
          provider: {
            type: String,
            enum: ['lalamove', 'grab_express', 'move_it', 'other'],
            required: true
          },
          name: {type: String, trim: true, maxlength: 60, default: null}
        },
        {_id: false}
      ),
      default: null
    },
    acquisition: {type: AcquisitionSchema, default: undefined},
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
      enum: [
        'online_full',
        'online_down_payment',
        'cash_on_pickup',
        'in_store_full',
        'in_store_down_payment',
        null
      ],
      default: null
    },
    balanceChoice: {
      type: String,
      enum: ['cash', 'online', 'in_store', null],
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
    cancelledBy: {
      type: String,
      enum: ['customer', 'store', 'system', null],
      default: null
    },
    refund: {
      type: new Schema(
        {
          policy: {type: String, enum: ['early', 'late', 'store'], required: true},
          paid: {type: Number, default: 0},
          retained: {type: Number, default: 0},
          onlineTotal: {type: Number, default: 0},
          cash: {type: Number, default: 0},
          feesRefunded: {type: Number, default: 0},
          feesNotRefunded: {type: Number, default: 0},
          refundTotal: {type: Number, default: 0},
          decidedAt: {type: Date, required: true}
        },
        {_id: false}
      ),
      default: null
    },
    cashRefundDue: {type: Number, default: 0},
    cashRefundedAt: {type: Date, default: null},
    cashRefundedBy: {type: String, default: null},
    cancelRequest: {
      type: new Schema(
        {
          status: {type: String, enum: ['pending', 'approved', 'declined'], required: true},
          reason: {type: String, default: null},
          requestedAt: {type: Date, required: true},
          decidedAt: {type: Date, default: null},
          decidedBy: {type: String, default: null},
          note: {type: String, default: null}
        },
        {_id: false}
      ),
      default: null
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'gcash', 'maya', 'grabpay', 'shopeepay', 'other', null],
      default: null
    },
    orderNumber: {type: String},
    clientRef: {type: String},
    paidAt: {type: Date, default: null},
    paidBy: {type: String, default: null},
    isOnline: {type: Boolean, default: true},
    isPreOrder: {type: Boolean, default: false},
    downPaymentPercent: {type: Number, default: null},
    preOrder: {
      type: new Schema(
        {
          eventId: {type: Schema.Types.ObjectId, ref: 'PreOrderEvent', required: true},
          eventTitle: {type: String, required: true},
          pickupDate: {type: Date, required: true},
          slotId: {type: Schema.Types.ObjectId, required: true},
          slotLabel: {type: String, required: true},
          pickupAt: {type: Date, required: true},
          receiveMethod: {type: String, enum: ['pickup', 'lalamove'], required: true},
          cancelDeadline: {type: Date, required: true},
          released: {type: Boolean, default: false}
        },
        {_id: false}
      ),
      default: null
    }
  },
  {timestamps: true}
);

OrderSchema.index({customerId: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, createdAt: -1});
OrderSchema.index({orderStatus: 1, overdueNotifiedAt: 1});
OrderSchema.index({orderSource: 1, createdAt: -1});
OrderSchema.index({orderNumber: 1}, {unique: true, sparse: true});
OrderSchema.index({clientRef: 1}, {unique: true, sparse: true});
OrderSchema.index({orderType: 1, createdAt: -1});
OrderSchema.index({'preOrder.eventId': 1, createdAt: -1});
// Change-check poll (GET /changes): latest-updated order.
OrderSchema.index({updatedAt: -1});

export const OrderModel = mongoose.model<OrderDocument>(
  'Order',
  OrderSchema,
  'orders'
);
