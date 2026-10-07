import {
  type ProductAllergen,
  type ProductIngredient
} from '@/lib/types/product';

export type ProductFormState = {
  name: string;
  category: string;
  price: string;
  stock: string;
  description: string;
  imageUrl: string;
  prepTimeMinutes: string;
  ingredients: ProductIngredient[];
  allergens: ProductAllergen[];
  isAvailable: boolean;
  pointsCost: string;
  isPreOrder: 'yes' | 'no';
  preOrderPurchaseLimit: string;
  /** YYYY-MM-DD for <input type="date">. */
  preOrderDeadline: string;
  /** How many batches the owner wants ("1".."4") — drives the row count. */
  preOrderBatchCount: string;
  /** One row per batch; times are "HH:MM", stock is a raw input string. */
  preOrderBatches: Array<{
    startTime: string;
    endTime: string;
    stock: string;
  }>;
  promoType: 'percentage' | 'fixed_amount' | 'bundle';
  discountRate: string;
  discountAmount: string;
  promoStartDate: string;
  promoEndDate: string;
  isPromoActive: boolean;
};

export const emptyProductForm: ProductFormState = {
  name: '',
  category: '',
  price: '',
  stock: '',
  description: '',
  imageUrl: '',
  prepTimeMinutes: '',
  ingredients: [],
  allergens: [],
  isAvailable: true,
  pointsCost: '',
  isPreOrder: 'no',
  preOrderPurchaseLimit: '',
  preOrderDeadline: '',
  preOrderBatchCount: '1',
  preOrderBatches: [{startTime: '', endTime: '', stock: ''}],
  promoType: 'percentage',
  discountRate: '',
  discountAmount: '',
  promoStartDate: '',
  promoEndDate: '',
  isPromoActive: true
};
