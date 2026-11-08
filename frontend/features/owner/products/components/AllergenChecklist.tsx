'use client';

import {Check, ChevronDown, Plus} from 'lucide-react';
import {useState} from 'react';
import {
  ALLERGEN_LABELS,
  ALLERGEN_OPTIONS
} from '@/lib/ingredients/allergens';
import {type ProductAllergen} from '@/lib/types/product';
import {cn} from '@/lib/utils';

interface Props {
  value: ProductAllergen[];
  onChange: (value: ProductAllergen[]) => void;
  disabled?: boolean;
}

export function AllergenChecklist({value, onChange, disabled}: Props) {
  const [open, setOpen] = useState(value.length > 0);

  const toggle = (allergen: ProductAllergen) => {
    if (value.includes(allergen)) {
      onChange(value.filter(a => a !== allergen));
    } else {
      onChange([...value, allergen]);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add allergen
        </button>
        {value.map(allergen => (
          <span
            key={allergen}
            className="inline-flex items-center gap-1 rounded-full bg-[#e9f5ee] dark:bg-[#7ed4a0]/10 text-[#1c2f24] dark:text-gray-100 px-3 py-1.5 text-sm"
          >
            <Check className="h-3.5 w-3.5 text-[#2d4a35] dark:text-[#7ed4a0]" />
            {ALLERGEN_LABELS[allergen]}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {ALLERGEN_OPTIONS.map(option => {
          const active = value.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors',
                active
                  ? 'border-[#2d4a35] dark:border-[#7ed4a0]/60 bg-[#e9f5ee] dark:bg-[#7ed4a0]/10 text-[#1c2f24] dark:text-gray-100'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(option.value)}
                disabled={disabled}
                className="accent-[#2d4a35]"
              />
              {option.label}
            </label>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ChevronDown className="h-3.5 w-3.5 rotate-180 transition-transform" />
        Done
      </button>
    </div>
  );
}