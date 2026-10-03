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
