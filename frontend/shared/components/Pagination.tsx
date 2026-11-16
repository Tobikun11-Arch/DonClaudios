'use client';

import {ChevronLeft, ChevronRight, Loader2} from 'lucide-react';
import {cn} from '@/lib/utils';

/** Page numbers to render, with ellipses: 1 … 4 5 6 … 12 */
export function pageWindow(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

interface Props {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
  /** Noun for the summary line, e.g. "products". */
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  isFetching = false,
  itemLabel = 'items',
  className
}: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const navClass = (active: boolean) =>
    cn(
      'flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition-colors',
      active
        ? 'border-[#2d4a35] dark:border-[#7ed4a0]/60 bg-[#2d4a35] text-white'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
    );

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {isFetching ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2d4a35] dark:text-[#7ed4a0]" />
            Loading page {page}…
          </span>
        ) : (
          <>
            Showing{' '}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {from}–{to}
            </span>{' '}
            of <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span>{' '}
            {itemLabel}
          </>
        )}
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={cn(navClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageWindow(page, totalPages).map((entry, idx) =>
            entry === '…' ? (
              <span key={`gap-${idx}`} className="px-1 text-xs text-gray-400">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={navClass(entry === page)}
              >
                {entry}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={cn(navClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
