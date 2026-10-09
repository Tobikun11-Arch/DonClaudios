import {type PreOrderBatch} from '@/lib/preOrder/preOrder';

export type ProductIngredient = {
  name: string;
  iconKey: string;
};

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

export type Product = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  stockUnit?: string;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes?: number | null;
  ingredients?: ProductIngredient[];
  allergens?: ProductAllergen[];
  isAvailable: boolean;
  pointsCost?: number | null;
  /** Pre-order: only in the 4 eligible categories, signed-in customers only. */
  isPreOrder?: boolean;
  /**
   * Max quantity one customer may order per pre-order DAY (all batches share
   * the allowance). Whole number >= 1.
   */
  preOrderPurchaseLimit?: number | null;
  /** Instant the pre-order DAY ends (end of the owner's chosen day, UTC+8). */
  preOrderDeadline?: string | null;
  /** The batch windows within that day; each owns its own stock. */
  preOrderBatches?: PreOrderBatch[] | null;
  /**
   * Server-computed allowance for the signed-in customer. `null` for guests
   * or non-pre-order products.
   */
  preOrderOrderedToday?: number | null;
  /** How many more this customer may still order today (null = unknown). */
  preOrderRemainingAllowance?: number | null;
  promoType?: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate?: number;
  discountAmount?: number;
  promoStartDate?: string;
  promoEndDate?: string;
  isPromoActive?: boolean;
  createdBy: string | {firstName: string; lastName: string} | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ListProductsResponse = {
  products: Product[];
};

export type GetProductResponse = {
  product: Product;
};

export type CreateProductBody = {
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes?: number | null;
  ingredients?: ProductIngredient[];
  allergens?: ProductAllergen[];
  isAvailable?: boolean;
  pointsCost?: number | null;
  isPreOrder?: boolean;
  preOrderPurchaseLimit?: number | null;
  preOrderDeadline?: string | null;
  /** Sent as `{startTime, endTime, stock}[]`; `sold` is server-managed. */
  preOrderBatches?: Array<{
    startTime: string;
    endTime: string;
    stock: number;
  }> | null;
  promoType?: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate?: number;
  discountAmount?: number;
  promoStartDate?: string;
  promoEndDate?: string;
  isPromoActive?: boolean;
};

export type CreateProductResponse = {
  product: Product;
};

export type UpdateProductBody = Partial<CreateProductBody>;

export type UpdateProductResponse = {
  product: Product;
};

export type DeleteProductResponse = {
  message: string;
};
