'use client';

import {useEffect, useRef, useState} from 'react';
import {ChevronDown, Search} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
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
        <div className="absolute right-0 top-10 z-30 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-xl">
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

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {STATUS_OPTIONS.map(opt => {
          const active = statusFilter === opt.value;
          const isProblem =
            opt.value === 'low_stock' || opt.value === 'out_of_stock';
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onStatusFilterChange(opt.value)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors',
                active
                  ? 'bg-[#2d4a35] text-white border-[#2d4a35]'
                  : isProblem && counts[opt.value] > 0
                    ? 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}
            >
              {opt.label}
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold',
                  active
                    ? 'bg-white/20 text-white'
                    : counts[opt.value] > 0
                      ? 'bg-[#e9f5ee] text-[#2d4a35]'
                      : 'bg-gray-100 text-gray-400'
                )}
              >
                {counts[opt.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}