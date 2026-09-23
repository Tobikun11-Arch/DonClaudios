import {type ProductAllergen} from '@/lib/types/product';

export const ALLERGEN_LABELS: Record<ProductAllergen, string> = {
  peanut: 'Peanuts',
  tree_nut: 'Tree Nuts',
  shellfish: 'Shellfish',
  fish: 'Fish',
  egg: 'Egg',
  dairy: 'Dairy/Milk',
  soy: 'Soy',
  gluten: 'Gluten/Wheat',
  sesame: 'Sesame',
  pork: 'Pork',
  beef: 'Beef',
  spicy: 'Spicy'
};

export const ALLERGEN_OPTIONS = (
  Object.keys(ALLERGEN_LABELS) as ProductAllergen[]
).map(key => ({value: key, label: ALLERGEN_LABELS[key]}));

const BULK_CATEGORIES = ['lechon', 'cochinillo'];

export function isBulkProductCategory(category: string): boolean {
  const normalized = category.trim().toLowerCase();
  return BULK_CATEGORIES.some(key => normalized === key);
}