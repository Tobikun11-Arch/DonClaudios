import {type Category, type CategoryType, type StockUnit} from '@/lib/types/category';

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  catering: 'Sold by weight (catering)',
  in_store: 'Per plate / piece (in-store)'
};

export const CATEGORY_TYPE_SHORT: Record<CategoryType, string> = {
  catering: 'By weight',
  in_store: 'Per plate'
};

export const STOCK_UNIT_LABELS: Record<StockUnit, string> = {
  kg: 'kg',
  piece: 'pcs',
  can: 'can',
  pitcher: 'pitcher'
};

export const STOCK_UNIT_HINTS: Record<StockUnit, string> = {
  kg: 'kilograms (by weight)',
  piece: 'pieces / servings',
  can: 'cans',
  pitcher: 'pitchers'
};

export function getCategoryByName(
  categories: Category[],
  name?: string
): Category | undefined {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  return categories.find(c => c.name.trim().toLowerCase() === normalized);
}

export function isCateringCategory(
  categories: Category[],
  name?: string
): boolean {
  return getCategoryByName(categories, name)?.type === 'catering';
}

export function stockUnitLabel(unit?: StockUnit | string): string {
  if (!unit) return '';
  const candidate = unit as StockUnit;
  return (STOCK_UNIT_LABELS[candidate] as string | undefined) ?? '';
}

export function stockUnitHint(unit?: StockUnit | string): string {
  if (!unit) return '';
  const candidate = unit as StockUnit;
  return (STOCK_UNIT_HINTS[candidate] as string | undefined) ?? '';
}