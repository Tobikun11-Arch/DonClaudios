'use client';

import {Plus, X} from 'lucide-react';
import {useRef, useState} from 'react';
import {
  ingredientIconByKey,
  matchIngredientIcon
} from '@/lib/ingredients/ingredientIcons';
import {type ProductIngredient} from '@/lib/types/product';

interface Props {
  ingredients: ProductIngredient[];
  onChange: (value: ProductIngredient[]) => void;
  disabled?: boolean;
}

export function IngredientChipsInput({
  ingredients,
  onChange,
  disabled
}: Props) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const {iconKey, Icon} = matchIngredientIcon(text);

  const add = () => {
    const name = text.trim();
    if (!name || disabled) return;
    const exists = ingredients.some(
      ing => ing.name.toLowerCase() === name.toLowerCase()
    );
    if (!exists) {
      onChange([...ingredients, {name, iconKey}]);
    }
    setText('');
    inputRef.current?.focus();
  };

  const remove = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-0.5 transition-colors focus-within:border-[#2d4a35] focus-within:ring-2 focus-within:ring-[#3c5e45]/20 overflow-hidden">
        <Icon className="h-4 w-4 text-gray-500 shrink-0" />
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type an ingredient and press Enter"
          disabled={disabled}
          className="flex-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        {text.trim() ? (
          <button
            type="button"
            onClick={add}
            disabled={disabled}
            className="text-[#2d4a35] hover:text-[#24402c]"
            aria-label="Add ingredient"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ingredients.map((ingredient, index) => {
            const ChipIcon = ingredientIconByKey(ingredient.iconKey);
            return (
              <span
                key={`${ingredient.name}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#e9f5ee] text-[#1c2f24] px-3 py-1.5 text-sm"
              >
                <ChipIcon className="h-4 w-4 shrink-0" />
                {ingredient.name}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  className="text-gray-500 hover:text-red-600 ml-0.5"
                  aria-label={`Remove ${ingredient.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}