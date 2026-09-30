'use client';

import {cn} from '@/lib/utils';
import {formatNumber, formatPeso, ReportBody, ShareBar} from './reportPrimitives';
import {ReportRowPicker} from './ReportRowPicker';
import type {ReportRowMetric, ReportRowOption} from './ReportRowPicker';
import type {ReportBreakdownRow} from '@/lib/types/report';

type Column = 'label' | 'secondary' | 'orders' | 'units' | 'revenue' | 'share';

const HEAD: Record<Column, string> = {
  label: 'Name',
  secondary: 'Group',
  orders: 'Orders',
  units: 'Units',
  revenue: 'Revenue',
  share: 'Share'
};

const ALIGN: Record<Column, string> = {
  label: 'text-left',
  secondary: 'text-left',
  orders: 'text-right',
  units: 'text-right',
  revenue: 'text-right',
  share: 'text-right'
};

const ALL_COLUMNS: Column[] = ['label', 'secondary', 'orders', 'units', 'revenue', 'share'];

/**
 * Scroll floor per column count. A flat 520px was applied to every table, so
 * the three-column Overview cards (Top products, Top customers) sat in
 * `lg:grid-cols-2` panes around 444px wide and scrolled sideways for nothing.
 */
const MIN_TABLE_WIDTH: Record<number, number> = {
  3: 360,
  4: 440,
  5: 480,
  6: 520
};

/**
 * One table shape for every dimension so the owner learns the layout once.
 * `secondary` (e.g. a product's category) and `units` are simply omitted for
 * dimensions that have no such concept.
 */
export function ReportBreakdownTable({
  rows,
  columns = ALL_COLUMNS,
  isLoading,
  isError,
  emptyMessage,
  showTotals = true,
  rank = false
}: {
  rows: ReportBreakdownRow[];
  columns?: Column[];
  isLoading: boolean;
  isError: boolean;
  emptyMessage?: string;
  showTotals?: boolean;
  rank?: boolean;
}) {
  const totals = rows.reduce(
    (acc, row) => ({
      orders: acc.orders + row.orders,
      units: acc.units + row.units,
      revenue: acc.revenue + row.revenue
    }),
    {orders: 0, units: 0, revenue: 0}
  );

  // Keys can repeat across dimensions, so the row index is folded into the
  // option value to keep it unique and stable for the picker's selection.
  const options: ReportRowOption[] = rows.map((row, index) => ({
    value: `${row.key}-${index}`,
    label: row.label,
    secondary: row.secondary
  }));
  const rowByValue = new Map(options.map((option, index) => [option.value, rows[index]]));

  const mobileMetrics = (option: ReportRowOption): ReportRowMetric[] => {
    const row = rowByValue.get(option.value);
    if (!row) return [];
    const metrics: Array<ReportRowMetric | false> = [
      columns.includes('orders') && {
        label: HEAD.orders,
        value: formatNumber(row.orders)
      },
      columns.includes('units') && {
        label: HEAD.units,
        value: formatNumber(row.units)
      },
      columns.includes('revenue') && {
        label: HEAD.revenue,
        value: formatPeso(row.revenue, row.revenue % 1 !== 0)
      },
      columns.includes('share') && {
        label: HEAD.share,
        value: `${formatNumber(Math.round(row.share * 10) / 10)}%`,
        share: row.share
      }
    ];
    return metrics.filter((metric): metric is ReportRowMetric => Boolean(metric));
  };

  return (
    <ReportBody
      isLoading={isLoading}
      isError={isError}
      isEmpty={rows.length === 0}
      emptyMessage={emptyMessage ?? 'No sales recorded in this period'}
      skeleton="rows"
    >
      <ReportRowPicker
        options={options}
        metrics={mobileMetrics}
        pickerLabel="Select a row to see its figures"
        rank={rank}
        summary={
          showTotals ? (
            <p className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg bg-[#F7FAF6] px-3 py-2 text-[0.75rem] text-[#6B7280]">
              <span className="font-bold uppercase tracking-[0.08em] text-[#1A1A1A]">Total</span>
              {columns.includes('orders') && (
                <span className="tabular-nums">{formatNumber(totals.orders)} orders</span>
              )}
              {columns.includes('units') && (
                <span className="tabular-nums">{formatNumber(totals.units)} units</span>
              )}
              {columns.includes('revenue') && (
                <span className="tabular-nums">{formatPeso(totals.revenue, totals.revenue % 1 !== 0)}</span>
              )}
            </p>
          ) : null
        }
      />
      <div className="hidden overflow-x-auto sm:block">
        <table
          className="w-full"
          style={{minWidth: (MIN_TABLE_WIDTH[columns.length] ?? 520) + (rank ? 40 : 0)}}
        >
          <thead>
            <tr className="border-t border-[#E5E7EB]">
              {rank && (
                <th className="w-10 px-3 py-2.5 text-left text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                  #
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col}
                  className={cn(
                    'px-4 py-2.5 text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]',
                    ALIGN[col]
                  )}
                >
                  {HEAD[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={`${row.key}-${index}`}
                className="border-t border-[#E5E7EB] transition-colors hover:bg-[#E8F0E3]"
              >
                {rank && (
                  <td className="px-3 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2D4A1E] text-[0.75rem] font-semibold text-white">
                      {index + 1}
                    </span>
                  </td>
                )}
                {columns.includes('label') && (
                  <td className="px-4 py-3 text-[0.875rem] font-medium text-[#1A1A1A]">
                    {row.label}
                  </td>
                )}
                {columns.includes('secondary') && (
                  <td className="px-4 py-3 text-[0.8rem] text-[#6B7280]">
                    {row.secondary ?? '—'}
                  </td>
                )}
                {columns.includes('orders') && (
                  <td className="px-4 py-3 text-right text-[0.875rem] tabular-nums text-[#1A1A1A]">
                    {formatNumber(row.orders)}
                  </td>
                )}
                {columns.includes('units') && (
                  <td className="px-4 py-3 text-right text-[0.875rem] tabular-nums text-[#1A1A1A]">
                    {formatNumber(row.units)}
                  </td>
                )}
                {columns.includes('revenue') && (
                  <td className="px-4 py-3 text-right text-[0.875rem] font-medium tabular-nums text-[#1A1A1A]">
                    {formatPeso(row.revenue, row.revenue % 1 !== 0)}
                  </td>
                )}
                {columns.includes('share') && (
                  <td className="px-4 py-3 text-right">
                    <span className="text-[0.8rem] font-medium tabular-nums text-[#1A1A1A]">
                      {formatNumber(Math.round(row.share * 10) / 10)}%
                    </span>
                    <span className="mt-1 block w-20">
                      <ShareBar share={row.share} />
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {showTotals && rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#E5E7EB] bg-[#F7FAF6]">
                {rank && <td />}
                {columns.includes('label') && (
                  <td className="px-4 py-3 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-[#1A1A1A]">
                    Total
                  </td>
                )}
                {columns.includes('secondary') && <td />}
                {columns.includes('orders') && (
                  <td className="px-4 py-3 text-right text-[0.875rem] font-bold tabular-nums text-[#1A1A1A]">
                    {formatNumber(totals.orders)}
                  </td>
                )}
                {columns.includes('units') && (
                  <td className="px-4 py-3 text-right text-[0.875rem] font-bold tabular-nums text-[#1A1A1A]">
                    {formatNumber(totals.units)}
                  </td>
                )}
                {columns.includes('revenue') && (
                  <td className="px-4 py-3 text-right text-[0.875rem] font-bold tabular-nums text-[#1A1A1A]">
                    {formatPeso(totals.revenue, totals.revenue % 1 !== 0)}
                  </td>
                )}
                {columns.includes('share') && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </ReportBody>
  );
}

/** Adapts a breakdown response to the flat row shape the CSV exporter expects. */
export function breakdownToCsvRows(rows: ReportBreakdownRow[]) {
  return rows.map(row => ({
    name: row.label,
    group: row.secondary ?? '',
    orders: row.orders,
    units: row.units,
    revenue: row.revenue,
    sharePercent: Math.round(row.share * 10) / 10
  }));
}
