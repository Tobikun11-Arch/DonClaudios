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
  promoType: 'percentage',
  discountRate: '',
  discountAmount: '',
  promoStartDate: '',
  promoEndDate: '',
  isPromoActive: true
};
