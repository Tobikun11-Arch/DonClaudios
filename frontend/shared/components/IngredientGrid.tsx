import {Label} from '@/components/ui/label';
import {ingredientIconByKey} from '@/lib/ingredients/ingredientIcons';
import {type ProductIngredient} from '@/lib/types/product';

export function IngredientGrid({
  ingredients
}: {
  ingredients: ProductIngredient[];
}) {
  if (!ingredients || ingredients.length === 0) return null;

  return (
    <div className="mt-8">
      <Label className="text-sm font-semibold text-gray-900">
        Ingredients
      </Label>
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {ingredients.map((ingredient, index) => {
          const Icon = ingredientIconByKey(ingredient.iconKey);
          return (
            <div
              key={`${ingredient.name}-${index}`}
              className="rounded-xl bg-[#f5f3ee] border border-gray-100 px-2 py-3 flex flex-col items-center gap-1.5"
            >
              <Icon className="h-6 w-6 text-[#5b6b5e] shrink-0" />
              <span className="text-[11px] text-gray-700 text-center leading-tight line-clamp-2">
                {ingredient.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}