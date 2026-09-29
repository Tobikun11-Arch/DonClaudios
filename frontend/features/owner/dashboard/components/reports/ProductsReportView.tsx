'use client';

import {useMemo, useState} from 'react';
import {
  useReportBreakdownQuery,
  useReportInventoryHealthQuery
} from '@/lib/hooks/report/useReport';
import {
  formatNumber,
  formatPeso,
  ReportBody,
  ReportCard,
  ReportNote
} from './reportPrimitives';
import {ReportBreakdownTable, breakdownToCsvRows} from './ReportBreakdownTable';
import {ReportExportBar} from './ReportExportBar';
import type {ReportRange} from '@/lib/types/report';

function StockTable({
  rows,
  valueKey,
  unitKey,
  isLoading,
  isError,
  emptyMessage
}: {
  /** Only the two columns actually rendered are required per row. */
  rows: Array<{
    key: string;
    label: string;
    stock?: number;
    stockValue?: number;
    units?: number;
    revenue?: number;
  }>;
  valueKey: 'stockValue' | 'revenue';
  unitKey: 'stock' | 'units';
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
}) {
  return (
    <ReportBody isLoading={isLoading} isError={isError} isEmpty={rows.length === 0} emptyMessage={emptyMessage} height={120}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px]">
          <thead>
            <tr className="border-t border-[#E5E7EB]">
              <th className="px-4 py-2.5 text-left text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                Product
              </th>
              <th className="px-4 py-2.5 text-right text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                {unitKey === 'stock' ? 'In stock' : 'Units sold'}
              </th>
              <th className="px-4 py-2.5 text-right text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                {valueKey === 'stockValue' ? 'Stock value' : 'Revenue'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.key}
                className="border-t border-[#E5E7EB] transition-colors hover:bg-[#E8F0E3]"
              >
                <td className="px-4 py-3 text-[0.875rem] font-medium text-[#1A1A1A]">{row.label}</td>
                <td className="px-4 py-3 text-right text-[0.875rem] tabular-nums text-[#1A1A1A]">
                  {formatNumber(row[unitKey] ?? 0)}
                </td>
                <td className="px-4 py-3 text-right text-[0.875rem] font-medium tabular-nums text-[#1A1A1A]">
                  {formatPeso(row[valueKey] ?? 0, (row[valueKey] ?? 0) % 1 !== 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportBody>
  );
}

export function ProductsReportView({range}: {range: ReportRange}) {
  const [dimension, setDimension] = useState<'product' | 'category'>('product');
  const healthQuery = useReportInventoryHealthQuery(range);
  const breakdownQuery = useReportBreakdownQuery(range, dimension, 15);

  const health = healthQuery.data;
  const breakdown = breakdownQuery.data;

  const csvRows = useMemo(() => breakdownToCsvRows(breakdown?.rows ?? []), [breakdown?.rows]);

  const tiles = [
    {label: 'Top sellers', value: formatNumber(health?.topSellers.length ?? 0), hint: 'ranked list'},
    {label: 'Slow movers', value: formatNumber(health?.slowMovers.length ?? 0), hint: '1 unit or less'},
    {label: 'Dead stock', value: formatNumber(health?.deadStock.length ?? 0), hint: 'never sold'},
    {label: 'Wastage', value: formatNumber(health?.wastage.units ?? 0), hint: 'units lost'}
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(tile => (
          <div
            key={tile.label}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
              {tile.label}
            </p>
            <p className="mt-1 text-[1.35rem] font-bold leading-none tabular-nums text-[#1A1A1A]">
              {healthQuery.isLoading ? '—' : tile.value}
            </p>
            <p className="mt-1 text-[0.7rem] text-[#6B7280]">{tile.hint}</p>
          </div>
        ))}
      </div>

      <ReportCard
        title="Stock value"
        subtitle="Unsold stock valued at menu price"
        action={
          <ReportExportBar
            view="products"
            range={range}
            rows={csvRows}
            columns={[
              {header: 'Name', value: r => r.name},
              {header: 'Group', value: r => r.group},
              {header: 'Orders', value: r => r.orders},
              {header: 'Units', value: r => r.units},
              {header: 'Revenue', value: r => r.revenue},
              {header: 'Share %', value: r => r.sharePercent}
            ]}
          />
        }
      >
        <div className="px-5 pb-5">
          <p className="text-[1.75rem] font-bold leading-none tabular-nums text-[#1A1A1A]">
            {healthQuery.isLoading ? '—' : formatPeso(health?.stockValue ?? 0)}
          </p>
          <ReportNote>
            There is no purchase-cost data in the system, so this is the menu price of stock on
            hand — a capital figure, not profit or margin.
          </ReportNote>
        </div>
      </ReportCard>

      <ReportCard
        title="Sales breakdown"
        subtitle={breakdown?.note ?? 'Ranked by revenue'}
        action={
          <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-0.5">
            {(['product', 'category'] as const).map(value => (
              <button
                key={value}
                type="button"
                onClick={() => setDimension(value)}
                className={
                  dimension === value
                    ? 'rounded-full bg-[#2d4a35] px-3 py-1 text-[0.7rem] font-bold capitalize text-white'
                    : 'rounded-full px-3 py-1 text-[0.7rem] font-bold capitalize text-gray-500 hover:bg-gray-50'
                }
              >
                {value}
              </button>
            ))}
          </div>
        }
      >
        <ReportBreakdownTable
          rows={breakdown?.rows ?? []}
          columns={dimension === 'product' ? ['label', 'secondary', 'units', 'orders', 'revenue', 'share'] : ['label', 'orders', 'revenue', 'share']}
          rank
          isLoading={breakdownQuery.isLoading}
          isError={breakdownQuery.isError}
        />
        {breakdown?.note && <ReportNote>{breakdown.note}</ReportNote>}
      </ReportCard>

      <ReportCard title="Top sellers" subtitle="Best performers, with remaining stock">
        <StockTable
          rows={health?.topSellers ?? []}
          unitKey="units"
          valueKey="revenue"
          isLoading={healthQuery.isLoading}
          isError={healthQuery.isError}
          emptyMessage="No sales in this period"
        />
      </ReportCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard title="Slow movers" subtitle="Sold 1 unit or fewer — consider restocking less">
          <StockTable
            rows={health?.slowMovers ?? []}
            unitKey="units"
            valueKey="revenue"
            isLoading={healthQuery.isLoading}
            isError={healthQuery.isError}
            emptyMessage="No slow movers in this period"
          />
        </ReportCard>

        <ReportCard title="Dead stock" subtitle="In stock but never sold in this period">
          <StockTable
            rows={health?.deadStock ?? []}
            unitKey="stock"
            valueKey="stockValue"
            isLoading={healthQuery.isLoading}
            isError={healthQuery.isError}
            emptyMessage="No dead stock in this period"
          />
        </ReportCard>
      </div>

      <ReportCard
        title="Wastage and shrinkage"
        subtitle={
          health && health.wastage.cost > 0
            ? `${formatNumber(health.wastage.units)} units removed`
            : 'Spoilage and stock adjustments'
        }
      >
        <ReportBody
          isLoading={healthQuery.isLoading}
          isError={healthQuery.isError}
          isEmpty={(health?.wastage.byProduct.length ?? 0) === 0}
          emptyMessage="No spoilage or stock adjustments recorded"
          height={120}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-t border-[#E5E7EB]">
                  <th className="px-4 py-2.5 text-left text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                    Product
                  </th>
                  <th className="px-4 py-2.5 text-right text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                    Units lost
                  </th>
                  <th className="px-4 py-2.5 text-right text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                    Value at menu price
                  </th>
                </tr>
              </thead>
              <tbody>
                {(health?.wastage.byProduct ?? []).map(row => (
                  <tr key={row.key} className="border-t border-[#E5E7EB] transition-colors hover:bg-[#E8F0E3]">
                    <td className="px-4 py-3 text-[0.875rem] font-medium text-[#1A1A1A]">{row.label}</td>
                    <td className="px-4 py-3 text-right text-[0.875rem] tabular-nums text-red-500">
                      {formatNumber(row.units)}
                    </td>
                    <td className="px-4 py-3 text-right text-[0.875rem] font-medium tabular-nums text-[#1A1A1A]">
                      {formatPeso(row.cost, row.cost % 1 !== 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportBody>
        <ReportNote>
          Restocks and sales are excluded; only spoilage and negative stock adjustments count
          as loss.
        </ReportNote>
      </ReportCard>
    </div>
  );
}
