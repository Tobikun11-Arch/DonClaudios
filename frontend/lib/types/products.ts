import {type ProductAllergen, type ProductIngredient} from '@/lib/types/product';

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
  rewardPointsOverride: string;
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
  rewardPointsOverride: ''
};
