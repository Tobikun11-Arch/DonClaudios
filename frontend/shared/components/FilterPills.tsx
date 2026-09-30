'use client';

import {ChevronDown} from 'lucide-react';
import {cn} from '@/lib/utils';

/**
 * The app's dropdown control: a native select (so phones get the platform
 * picker) with `appearance-none` plus an overlaid chevron to stay on-theme.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{value: string; label: string}>;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3.5 pr-9 text-sm font-medium text-gray-700 focus:border-[#2d4a35] focus:outline-none focus:ring-2 focus:ring-[#2d4a35]/20"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  );
}

export type FilterPill = {key: string; label: string};

/**
 * A row of pill filters that collapses into a dropdown on phones.
 *
 * A handful of labels never fit a phone width, and scrolling them sideways was
 * invisible: the scrollbar is hidden and nothing hinted that more existed. So
 * below `sm` the pills become one select. The pills keep their horizontal
 * scroll from `sm` up, where the tightest realistic case still overflows.
 */
export function FilterPills({
  items,
  value,
  onChange,
  ariaLabel,
  className
}: {
  items: ReadonlyArray<FilterPill>;
  value: string;
  onChange: (key: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <>
      <div
        role="group"
        aria-label={ariaLabel}
        className={cn(
          'hidden gap-2 overflow-x-auto scrollbar-hide sm:-mx-1 sm:flex sm:px-1 sm:pb-1',
          className
        )}
      >
        {items.map(item => {
          const active = item.key === value;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(item.key)}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'border-[#2d4a35] bg-[#2d4a35] text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <FilterSelect
        value={value}
        onChange={onChange}
        options={items.map(item => ({value: item.key, label: item.label}))}
        ariaLabel={ariaLabel}
        className={cn('sm:hidden', className)}
      />
    </>
  );
}
