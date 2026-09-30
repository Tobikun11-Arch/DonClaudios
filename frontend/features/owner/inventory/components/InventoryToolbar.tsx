'use client';

import {useEffect, useRef, useState} from 'react';
import {ChevronDown, Search} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {FilterPills} from '@/shared/components/FilterPills';
import type {StockStatus} from '../utils/stockStatus';

export const SORT_OPTIONS = [
  {value: 'attention', label: 'Needs attention first'},
  {value: 'name_asc', label: 'Name A to Z'},
  {value: 'stock_asc', label: 'Stock: low to high'},
  {value: 'stock_desc', label: 'Stock: high to low'},
  {value: 'updated', label: 'Recently updated'}
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

const STATUS_OPTIONS: Array<{
  value: 'all' | StockStatus;
  label: string;
}> = [
  {value: 'all', label: 'All'},
  {value: 'in_stock', label: 'In Stock'},
  {value: 'low_stock', label: 'Low Stock'},
  {value: 'out_of_stock', label: 'Out of Stock'}
];

interface DropdownProps {
  value: string;
  options: ReadonlyArray<{value: string; label: string}>;
  allLabel: string;
  allValue?: string;
  onChange: (v: string) => void;
  className?: string;
}

export function InventoryDropdown({
  value,
  options,
  allLabel,
  allValue = 'all',
  onChange,
  className
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const current =
    value === allValue
      ? allLabel
      : (options.find(o => o.value === value)?.label ?? allLabel);

  return (
    <div ref={ref} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50',
          open && 'border-gray-300 bg-gray-50'
        )}
      >
        <span className="max-w-36 truncate">{current}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-[55] overscroll-contain bg-black/30 sm:hidden"
          />
          {/*
            Below `sm` this is a bottom sheet. `absolute right-0 w-56` extended
            leftward from a trigger that sits at the left of the toolbar, so it
            hung off the left edge and `overflow-x: hidden` clipped it. Every
            horizontal property is overridden at `sm` to rebuild the popover.
          */}
          <div
            role="dialog"
            aria-label={current}
            className="fixed inset-x-3 bottom-24 z-[60] max-h-[70vh] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-1 shadow-xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-10 sm:z-30 sm:mt-1 sm:max-h-none sm:w-56 sm:overflow-y-visible sm:overscroll-auto"
          >
          <button
            type="button"
            onClick={() => {
              onChange(allValue);
              setOpen(false);
            }}
            className={cn(
              'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              value === allValue
                ? 'bg-[#e9f5ee] font-semibold text-[#2d4a35]'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            {allLabel}
          </button>
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                value === option.value
                  ? 'bg-[#e9f5ee] font-semibold text-[#2d4a35]'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {option.label}
            </button>
          ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  counts: Record<'all' | StockStatus, number>;
  statusFilter: 'all' | StockStatus;
  onStatusFilterChange: (v: 'all' | StockStatus) => void;
  categories: string[];
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
}

export function InventoryToolbar({
  search,
  onSearchChange,
  counts,
  statusFilter,
  onStatusFilterChange,
  categories,
  categoryFilter,
  onCategoryChange,
  sort,
  onSortChange
}: ToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <InventoryDropdown
            value={categoryFilter}
            allLabel="All categories"
            options={categories.map(c => ({value: c, label: c}))}
            onChange={onCategoryChange}
          />
          <InventoryDropdown
            value={sort}
            allLabel="Needs attention first"
            options={SORT_OPTIONS.map(o => ({value: o.value, label: o.label}))}
            onChange={onSortChange as (v: string) => void}
          />
        </div>
      </div>

      {/*
        Status chips overflowed a phone and forced sideways scrolling. Pills on
        `sm`+, the shared dropdown below it, with counts folded into each label.
      */}
      <FilterPills
        ariaLabel="Stock status"
        items={STATUS_OPTIONS.map(opt => ({
          key: opt.value,
          label: `${opt.label} (${counts[opt.value]})`
        }))}
        value={statusFilter}
        onChange={v => onStatusFilterChange(v as 'all' | StockStatus)}
      />
    </div>
  );
}