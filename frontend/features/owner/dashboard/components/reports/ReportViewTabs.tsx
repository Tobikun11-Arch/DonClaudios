'use client';

import {cn} from '@/lib/utils';
import {REPORT_VIEWS} from '@/lib/types/report';
import type {ReportView} from '@/lib/types/report';

/**
 * Reports live as sub-tabs inside the Dashboard tab (there is no separate
 * Reports nav item), mirroring the pill styling used by the inventory filters.
 */
export function ReportViewTabs({
  value,
  onChange
}: {
  value: ReportView;
  onChange: (view: ReportView) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Report views"
      className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1"
    >
      {REPORT_VIEWS.map(view => {
        const active = view.key === value;
        return (
          <button
            key={view.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(view.key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors border',
              active
                ? 'bg-[#2d4a35] text-white border-[#2d4a35]'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
