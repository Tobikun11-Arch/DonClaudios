import {Label} from '@/components/ui/label';
import {ALLERGEN_LABELS} from '@/lib/ingredients/allergens';
import {type ProductAllergen} from '@/lib/types/product';

export function AllergenBadges({
  allergens
}: {
  allergens: ProductAllergen[];
}) {
  const list = allergens ?? [];

  return (
    <div className="mt-6">
      <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Allergens</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {list.length === 0 ? (
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            No known allergens
          </span>
        ) : (
          list.map(allergen => (
            <span
              key={allergen}
              className="inline-flex items-center rounded-full border border-red-300 bg-red-50 text-[#c30010] px-3 py-1 text-xs font-semibold dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
            >
              Contains: {ALLERGEN_LABELS[allergen]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}