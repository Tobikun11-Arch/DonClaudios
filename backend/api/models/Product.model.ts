import mongoose, {Schema} from 'mongoose';
import {STOCK_UNITS, type StockUnit} from './Category.model';

export const ALLERGEN_VALUES = [
  'peanut',
  'tree_nut',
  'shellfish',
  'fish',
  'egg',
  'dairy',
  'soy',
  'gluten',
  'sesame',
  'pork',
  'beef',
  'spicy'
] as const;

export type ProductAllergen = (typeof ALLERGEN_VALUES)[number];

export interface ProductIngredient {
  name: string;
  iconKey: string;
}

export interface ProductDocument extends mongoose.Document {
  name: string;
  category: string;
  price: number;
  stock: number;
  stockUnit?: StockUnit;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes?: number;
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
  /** Max quantity one customer may order. Whole number >= 1. */
  preOrderPurchaseLimit?: number | null;
  /** Instant pre-orders close (end of the owner's chosen day, UTC+8). */
  preOrderDeadline?: Date | null;
  promoType?: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate?: number;
  discountAmount?: number;
  promoStartDate?: Date;
  promoEndDate?: Date;
  isPromoActive?: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const ProductIngredientSchema = new Schema<ProductIngredient>(
  {
    name: {type: String, required: true, trim: true, maxlength: 80},
    iconKey: {type: String, required: true, trim: true, maxlength: 64}
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
    prepTimeMinutes: {type: Number, min: 0, max: 1440, default: null},
    ingredients: {type: [ProductIngredientSchema], default: []},
    allergens: {type: [String], enum: [...ALLERGEN_VALUES], default: []},
    isAvailable: {type: Boolean, default: true},
    pointsCost: {type: Number, min: 0, default: null},
    isPreOrder: {type: Boolean, default: false},
    preOrderPurchaseLimit: {type: Number, min: 1, default: null},
    preOrderDeadline: {type: Date, default: null},
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
