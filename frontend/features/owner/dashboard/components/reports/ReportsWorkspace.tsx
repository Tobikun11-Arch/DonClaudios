'use client';

import {useMemo} from 'react';
import {ReportViewTabs} from './ReportViewTabs';
import {ReportRangePicker, rangeLabel} from './ReportRangePicker';
import {ReportExportBar} from './ReportExportBar';
import {OverviewReportView} from './OverviewReportView';
import {SalesReportView} from './SalesReportView';
import {OperationsReportView} from './OperationsReportView';
import {ProductsReportView} from './ProductsReportView';
import {CustomersReportView} from './CustomersReportView';
import type {ReportRange, ReportView} from '@/lib/types/report';

export const DEFAULT_REPORT_RANGE: ReportRange = {preset: '7d'};

function isValidView(value: string | null): value is ReportView {
  return value === 'overview' || value === 'sales' || value === 'operations' ||
    value === 'products' || value === 'customers';
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
  // The overview is a digest, so it carries its own export affordance set; the
  // detailed views supply their own CSV columns alongside the PDF button.
  const headerExport = useMemo(
    () =>
      view === 'overview' ? (
        <ReportExportBar view={view} range={range} />
      ) : null,
    [view, range]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReportViewTabs value={view} onChange={onViewChange} />
        {showRangePicker && (
          <div className="flex flex-wrap items-center gap-2">
            <ReportRangePicker value={range} onChange={onRangeChange} />
            {headerExport}
          </div>
        )}
      </div>

      {view === 'overview' && <OverviewReportView range={range} />}
      {view === 'sales' && <SalesReportView range={range} />}
      {view === 'operations' && <OperationsReportView range={range} />}
      {view === 'products' && <ProductsReportView range={range} />}
      {view === 'customers' && <CustomersReportView range={range} />}
    </div>
  );
}

export {isValidView};
