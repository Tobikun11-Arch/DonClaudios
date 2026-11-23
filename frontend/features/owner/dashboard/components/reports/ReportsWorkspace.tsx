'use client';

import {useEffect, useMemo, useState} from 'react';
import {DetailedReportView} from './DetailedReportView';
import {cn} from '@/lib/utils';
import {useSearchParams} from 'next/navigation';
import {ReportViewTabs} from './ReportViewTabs';
import {ReportRangePicker} from './ReportRangePicker';
import {ReportExportBar} from './ReportExportBar';
import {OverviewReportView} from './OverviewReportView';
import {SalesReportView} from './SalesReportView';
import {OperationsReportView} from './OperationsReportView';
import {ProductsReportView} from './ProductsReportView';
import {CustomersReportView} from './CustomersReportView';
import type {ReportRange, ReportView} from '@/lib/types/report';

export const DEFAULT_REPORT_RANGE: ReportRange = {preset: 'today'};

function isValidView(value: string | null): value is ReportView {
  return value === 'overview' || value === 'sales' || value === 'operations' ||
    value === 'products' || value === 'customers' || value === 'staff';
}

type DetailMode = 'summary' | 'detailed';

/** Keeps `?view=` and `?mode=` in the URL so a refresh lands on the same table. */
function writeUrl(view: ReportView, mode: DetailMode) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (mode === 'detailed') url.searchParams.set('mode', 'detailed');
    else url.searchParams.delete('mode');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // URL sync is a convenience only.
  }
}

/**
 * Owns the shared report state (view + range) and renders the matching panel.
 * Keeping the range here is what makes every tab, KPI and export agree on the
 * same window.
 */
export function ReportsWorkspace({
  view,
  range,
  onViewChange,
  onRangeChange,
  showRangePicker = true
}: {
  view: ReportView;
  range: ReportRange;
  onViewChange: (view: ReportView) => void;
  onRangeChange: (range: ReportRange) => void;
  showRangePicker?: boolean;
}) {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<DetailMode>(
    searchParams.get('mode') === 'detailed' ? 'detailed' : 'summary'
  );
  // Overview is a digest only; Staff only has the detailed log.
  const canToggle = view !== 'overview' && view !== 'staff';
  const effectiveMode: DetailMode = view === 'staff' ? 'detailed' : view === 'overview' ? 'summary' : mode;
  useEffect(() => writeUrl(view, effectiveMode), [view, effectiveMode]);

  // The overview is a digest, so it carries its own export affordance set; the
  // detailed views supply their own CSV columns alongside the PDF button.
  const headerExport = useMemo(
    () =>
      view === 'overview' ? (
        <ReportExportBar view={view} range={range} />
      ) : null,
    [view, range]
  );

  const modeToggle = canToggle ? (
    <div
      role="group"
      aria-label="Report detail"
      className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900"
    >
      {(['summary', 'detailed'] as const).map(m => (
        <button
          key={m}
          type="button"
          aria-pressed={effectiveMode === m}
          onClick={() => setMode(m)}
          className={cn(
            'rounded-full px-3 py-1 text-[0.8rem] font-semibold capitalize transition-colors',
            effectiveMode === m
              ? 'bg-[#2d4a35] text-white'
              : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'
          )}
        >
          {m}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReportViewTabs value={view} onChange={onViewChange} />
        {showRangePicker && (
          <div className="flex flex-wrap items-center gap-2">
            <ReportRangePicker value={range} onChange={onRangeChange} />
            {modeToggle}
            {headerExport}
          </div>
        )}
      </div>

      {view === 'overview' && <OverviewReportView range={range} />}
      {effectiveMode === 'detailed' && view !== 'overview' ? (
        <DetailedReportView key={view} view={view} range={range} />
      ) : (
        <>
          {view === 'sales' && <SalesReportView range={range} />}
          {view === 'operations' && <OperationsReportView range={range} />}
          {view === 'products' && <ProductsReportView range={range} />}
          {view === 'customers' && <CustomersReportView range={range} />}
        </>
      )}
    </div>
  );
}

export {isValidView};
