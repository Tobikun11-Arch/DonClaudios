'use client';

import {Bike} from 'lucide-react';
import {COURIER_OPTIONS, type CourierProvider} from '@/lib/orders/orderFlow';
import {cn} from '@/lib/utils';

export type CourierChoice = {provider: CourierProvider | null; name: string};

export function isCourierChoiceComplete(choice: CourierChoice): boolean {
  if (!choice.provider) return false;
  return choice.provider !== 'other' || choice.name.trim().length > 0;
}

/**
 * "Which courier will you book?" for deliveries the customer books
 * themself, so the store knows which rider to expect at the counter.
 */
export default function CourierPicker({
  value,
  onChange
}: {
  value: CourierChoice;
  onChange: (next: CourierChoice) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
        <Bike className="h-3.5 w-3.5" />
        Which courier will you book?
      </p>
      <div role="radiogroup" aria-label="Courier" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COURIER_OPTIONS.map(opt => {
          const active = value.provider === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({...value, provider: opt.value})}
              className={cn(
                'min-h-[40px] rounded-xl border px-3 text-xs font-semibold transition-colors',
                active
                  ? 'border-[#3c5e45] bg-[#3c5e45] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-[#3c5e45]/50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-[#7ed4a0]/50'
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {value.provider === 'other' ? (
        <input
          value={value.name}
          onChange={e => onChange({...value, name: e.target.value.slice(0, 60)})}
          placeholder="Courier name (e.g. Angkas Padala, Toktok)"
          aria-label="Courier name"
          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#3c5e45] focus:outline-none focus:ring-2 focus:ring-[#3c5e45]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      ) : null}
    </div>
  );
}
