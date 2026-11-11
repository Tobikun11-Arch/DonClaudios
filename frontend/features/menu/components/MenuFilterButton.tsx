'use client';

import {useEffect, useRef, useState} from 'react';
import {Check, SlidersHorizontal, X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {type ProductAllergen} from '@/lib/types/product';
import {useAllergenCatalog} from '@/lib/hooks/useAllergens';
import type {MenuSort} from '../menuItems';

const SORT_OPTIONS: {value: MenuSort; label: string}[] = [
  {value: 'recommended', label: 'Recommended'},
  {value: 'price-asc', label: 'Price: low to high'},
  {value: 'price-desc', label: 'Price: high to low'}
];


/**
 * The filter button beside Search and its dropdown: hide items that contain
 * chosen allergens, and sort by price. The badge counts active filters.
 */
export function MenuFilterButton({
  excluded,
  onExcludedChange,
  sort,
  onSortChange
}: {
  excluded: ReadonlySet<ProductAllergen>;
  onExcludedChange: (next: Set<ProductAllergen>) => void;
  sort: MenuSort;
  onSortChange: (next: MenuSort) => void;
}) {
  const [open, setOpen] = useState(false);
  const catalog = useAllergenCatalog();
  // Every allergen the store knows, owner-added ones included.
  const allergenOrder = catalog.sort(catalog.options.map(o => o.key));
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount = excluded.size + (sort === 'recommended' ? 0 : 1);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleAllergen = (allergen: ProductAllergen) => {
    const next = new Set(excluded);
    if (next.has(allergen)) next.delete(allergen);
    else next.add(allergen);
    onExcludedChange(next);
  };

  return (
    <div ref={rootRef} className="relative z-40 shrink-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
        className={cn(
          'relative grid h-11 w-11 place-items-center rounded-xl transition-colors',
          open || activeCount > 0
            ? 'bg-[#2d4a35] text-white hover:bg-[#3c5e45]'
            : 'border border-gray-200 bg-white text-[#2d4a35] hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-[#7ed4a0] dark:hover:bg-gray-800'
        )}
      >
        <SlidersHorizontal size={20} />
        {activeCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#c30010] px-1 text-[11px] font-bold text-white ring-2 ring-white dark:ring-gray-800">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Menu filters"
          className="absolute left-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">Filters</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="grid h-8 w-8 place-items-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Hide items that contain
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {allergenOrder.map(allergen => {
              const Icon = catalog.icon(allergen);
              const on = excluded.has(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleAllergen(allergen)}
                  className={cn(
                    'flex min-h-[40px] items-center gap-2 rounded-xl border px-2.5 text-left text-sm font-medium transition-colors',
                    on
                      ? 'border-[#c30010]/40 bg-red-50 text-[#c30010] dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{catalog.shortLabel(allergen)}</span>
                  {on && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Sort by
          </p>
          <div role="radiogroup" aria-label="Sort by" className="mt-2 flex flex-col gap-1">
            {SORT_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={sort === option.value}
                onClick={() => onSortChange(option.value)}
                className={cn(
                  'flex min-h-[40px] items-center justify-between rounded-xl px-3 text-sm font-medium transition-colors',
                  sort === option.value
                    ? 'bg-[#2d4a35]/10 text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800'
                )}
              >
                {option.label}
                {sort === option.value && <Check className="h-4 w-4" aria-hidden />}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                onExcludedChange(new Set());
                onSortChange('recommended');
              }}
              disabled={activeCount === 0}
              className="min-h-[40px] flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[40px] flex-1 rounded-xl bg-[#2d4a35] text-sm font-semibold text-white hover:bg-[#24402c]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
