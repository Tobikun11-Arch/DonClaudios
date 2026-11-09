import mongoose, {Schema} from 'mongoose';

/*
 * A pre-order DATE (e.g. "Christmas Eve", pickup Dec 24).
 *
 * The owner publishes the date ahead of time; customers order lechon sizes
 * for it and pick a pickup time slot. Sizes and slots live on the date (not
 * on the product) because prices and capacity change per date.
 *
 * Capacity is tracked with a `remaining` counter that is decremented with a
 * conditional update (`remaining >= qty`), so two customers can never buy the
 * last unit at the same time. Cancelled / expired orders give it back.
 */

export type PreOrderEventStatus = 'draft' | 'published' | 'closed';

export interface PreOrderSize {
  _id: mongoose.Types.ObjectId;
  label: string;
  /** e.g. "Good for 12-15 pax" or "3.5-4.5 kg cooked weight". */
  description?: string | null;
  price: number;
  /** Total pieces available for this date. */
  stock: number;
  /** Pieces still available (stock minus active orders). */
  remaining: number;
  /**
   * Most one customer can take of this size for the date, across all of
   * their active orders (field name kept for existing data).
   */
  maxPerOrder: number;
}

export interface PreOrderEventProduct {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  sizes: PreOrderSize[];
  /** How many different sizes of this product one customer may choose. */
  maxSizes: number;
}

export interface PreOrderSlot {
  _id: mongoose.Types.ObjectId;
  /** Display label, e.g. "8 - 9 AM". */
  label: string;
  /** Start time "HH:MM" (Manila), used as the scheduled pickup time. */
  startTime: string;
  limit: number;
  remaining: number;
}

export interface PreOrderEventDocument extends mongoose.Document {
  title: string;
  /** Pickup day, stored as Manila midnight (UTC instant). */
  pickupDate: Date;
  status: PreOrderEventStatus;
  description?: string | null;
  /** Customers can cancel until this many days before the pickup date. */
  cancelCutoffDays: number;
  /** Active (not cancelled) pre-orders one customer may have for this date. */
  maxOrdersPerCustomer: number;
  products: PreOrderEventProduct[];
  slots: PreOrderSlot[];
  publishedAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SizeSchema = new Schema<PreOrderSize>({
  label: {type: String, required: true, trim: true, maxlength: 120},
  description: {type: String, default: null, trim: true, maxlength: 200},
  price: {type: Number, required: true, min: 0},
  stock: {type: Number, required: true, min: 0},
  remaining: {type: Number, required: true, min: 0},
  maxPerOrder: {type: Number, required: true, min: 1, default: 1}
});

const EventProductSchema = new Schema<PreOrderEventProduct>({
  productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
  sizes: {type: [SizeSchema], default: []},
  maxSizes: {type: Number, min: 1, default: 1}
});

const SlotSchema = new Schema<PreOrderSlot>({
  label: {type: String, required: true, trim: true, maxlength: 40},
  startTime: {type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/},
  limit: {type: Number, required: true, min: 0},
  remaining: {type: Number, required: true, min: 0}
});

const PreOrderEventSchema = new Schema<PreOrderEventDocument>(
  {
    title: {type: String, required: true, trim: true, maxlength: 80},
    pickupDate: {type: Date, required: true},
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft'
    },
    description: {type: String, default: null, trim: true, maxlength: 300},
    cancelCutoffDays: {type: Number, min: 0, max: 60, default: 14},
    maxOrdersPerCustomer: {type: Number, min: 1, default: 1},
    products: {type: [EventProductSchema], default: []},
    slots: {type: [SlotSchema], default: []},
    publishedAt: {type: Date, default: null},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin', default: null}
  },
  {timestamps: true}
);

PreOrderEventSchema.index({status: 1, pickupDate: 1});
PreOrderEventSchema.index({pickupDate: 1});

export const PreOrderEventModel = mongoose.model<PreOrderEventDocument>(
  'PreOrderEvent',
  PreOrderEventSchema,
  'preorder_events'
);
