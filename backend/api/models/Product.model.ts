import mongoose, {Schema} from 'mongoose';
import {STOCK_UNITS, type StockUnit} from './Category.model';

/**
 * An allergen key: one of the built-ins (see BUILT_IN_ALLERGENS in
 * Allergen.model) or one the owner added. Checked by allergenService on save.
 */
export type ProductAllergen = string;

/** Units for "what one serving includes" (display only, never stock). */
export const SERVING_UNITS = ['pcs', 'slices', 'cups', 'g', 'ml', 'kg', 'pax'] as const;
export type ServingUnit = (typeof SERVING_UNITS)[number];

/** One item inside a bundle product: which product, and how many of it. */
export interface ProductBundleItem {
  productId: mongoose.Types.ObjectId;
  qty: number;
}

export interface ProductIngredient {
  name: string;
  iconKey: string;
}

/**
 * One pre-order batch within the owner's chosen day. Times are store-local
 * (UTC+8) wall-clock strings, so moving `preOrderDeadline` moves every
 * batch's window with it.
 */
export interface PreOrderBatch {
  /** "HH:MM" — window opens. */
  startTime: string;
  /** "HH:MM" — window closes. Must be after `startTime`. */
  endTime: string;
  /** Stock allocated to this batch. Whole number >= 1. */
  stock: number;
  /** Units already sold from this batch. Maintained by order deduct/restore. */
  sold: number;
}

export interface ProductDocument extends mongoose.Document {
  name: string;
  category: string;
  price: number;
  stock: number;
  stockUnit?: StockUnit;
  description?: string;
  imageUrl?: string;
  /**
   * What one serving includes, e.g. 6 pcs (Buffalo Wings) or 4 pax. Shown on
   * the menu only; not tied to inventory. Both set or both null.
   */
  servingQty?: number | null;
  servingUnit?: ServingUnit | null;
  /**
   * Bundle Deal (category "Promo", promoType "bundle"): what one bundle
   * contains. A bundle holds no stock of its own; orders take stock from
   * these products (services/bundle.service.ts).
   */
  bundleItems?: ProductBundleItem[] | null;
  prepTimeMinutes?: number;
  /**
   * Minimum notice (hours) before this product can be picked up / served.
   * Null = use the category's notice (see config/orderSchedule.ts).
   */
  minNoticeHours?: number | null;
  isAvailable: boolean;
  ingredients: ProductIngredient[];
  allergens: ProductAllergen[];
  /**
   * Points a customer must spend to redeem this product as a reward.
   * Owner-editable. Seeded once by scripts/backfillRewardPointsCost.ts
   * (price * 20, rounded to the nearest 50) and then stored — never
   * recomputed from `price` at runtime.
   */
  pointsCost?: number | null;
  /**
   * Pre-order: only available in the categories listed in
   * api/config/preOrder.ts, only orderable by signed-in customers, and
   * hidden entirely from guests.
   */
  isPreOrder?: boolean;
  /** Sold only through dated pre-orders; hidden from the regular menu. */
  preOrderOnly?: boolean;
  /**
   * Max quantity one customer may order per pre-order DAY (all batches share
   * the allowance). Whole number >= 1.
   */
  preOrderPurchaseLimit?: number | null;
  /** Instant the pre-order DAY ends (end of the owner's chosen day, UTC+8). */
  preOrderDeadline?: Date | null;
  /**
   * The batches within the pre-order day. Each batch owns its own stock and
   * only accepts orders while its time window is live. `product.stock` stays
   * the total remaining across batches (sum(batch.stock - batch.sold)).
   */
  preOrderBatches?: PreOrderBatch[] | null;
  promoType?: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate?: number;
  discountAmount?: number;
  promoStartDate?: Date;
  promoEndDate?: Date;
  isPromoActive?: boolean;
  /**
   * Newsletter guard: null = not emailed yet, a date = emailed. Missing on
   * products made before the newsletter, so editing those never emails.
   */
  newsletterSentAt?: Date | null;
  createdBy: mongoose.Types.ObjectId;
}

const ProductIngredientSchema = new Schema<ProductIngredient>(
  {
    name: {type: String, required: true, trim: true, maxlength: 80},
    iconKey: {type: String, required: true, trim: true, maxlength: 64}
  },
  {_id: false}
);

const PreOrderBatchSchema = new Schema<PreOrderBatch>(
  {
    startTime: {type: String, required: true, trim: true},
    endTime: {type: String, required: true, trim: true},
    stock: {type: Number, required: true, min: 1},
    sold: {type: Number, min: 0, default: 0}
  },
  {_id: false}
);

const ProductSchema = new Schema<ProductDocument>(
  {
    name: {type: String, required: true, trim: true},
    category: {type: String, required: true, trim: true},
    price: {type: Number, required: true, min: 0},
    stock: {type: Number, required: true, min: 0},
    stockUnit: {type: String, enum: [...STOCK_UNITS]},
    description: {type: String},
    imageUrl: {type: String},
    servingQty: {type: Number, min: 0, max: 9999, default: null},
    servingUnit: {type: String, enum: [...SERVING_UNITS, null], default: null},
    bundleItems: {
      type: [
        new Schema<ProductBundleItem>(
          {
            productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
            qty: {type: Number, required: true, min: 1, max: 99}
          },
          {_id: false}
        )
      ],
      default: undefined
    },
    prepTimeMinutes: {type: Number, min: 0, max: 1440, default: null},
    minNoticeHours: {type: Number, min: 0, max: 72, default: null},
    ingredients: {type: [ProductIngredientSchema], default: []},
    allergens: {type: [String], default: []},
    isAvailable: {type: Boolean, default: true},
    pointsCost: {type: Number, min: 0, default: null},
    isPreOrder: {type: Boolean, default: false},
    // Sold only through dated pre-orders (Holiday pre-orders): hidden from the
    // regular menu, cart and counter. Sizes and prices live on each date.
    preOrderOnly: {type: Boolean, default: false},
    preOrderPurchaseLimit: {type: Number, min: 1, default: null},
    preOrderDeadline: {type: Date, default: null},
    preOrderBatches: {type: [PreOrderBatchSchema], default: null},
    promoType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'bundle'],
      default: undefined
    },
    discountRate: {type: Number, min: 0, default: undefined},
    discountAmount: {type: Number, min: 0, default: undefined},
    promoStartDate: {type: Date, default: undefined},
    promoEndDate: {type: Date, default: undefined},
    isPromoActive: {type: Boolean, default: undefined},
    // No default on purpose: missing (old products) must stay distinct from null.
    newsletterSentAt: {type: Date},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin', required: true}
  },
  {timestamps: true}
);

ProductSchema.index({category: 1});
ProductSchema.index({isAvailable: 1});

export const ProductModel = mongoose.model<ProductDocument>(
  'Product',
  ProductSchema,
  'products'
);
