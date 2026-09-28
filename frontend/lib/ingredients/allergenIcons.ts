import {type ProductAllergen} from '@/lib/types/product';
import {
  type LucideIcon,
  Beef,
  Bean,
  Drumstick,
  Droplet,
  Egg,
  Fish,
  Flame,
  Leaf,
  Milk,
  Nut,
  Shrimp,
  Wheat
} from 'lucide-react';

export const ALLERGEN_ICONS: Record<ProductAllergen, LucideIcon> = {
  peanut: Nut,
  tree_nut: Leaf,
  shellfish: Shrimp,
  fish: Fish,
  egg: Egg,
  dairy: Milk,
  soy: Bean,
  gluten: Wheat,
  sesame: Droplet,
  pork: Drumstick,
  beef: Beef,
  spicy: Flame
};

export function allergenIcon(allergen: ProductAllergen): LucideIcon {
  return ALLERGEN_ICONS[allergen] ?? Leaf;
}