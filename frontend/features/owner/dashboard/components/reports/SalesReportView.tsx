'use client';

import {useMemo, useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {cn} from '@/lib/utils';
import {FilterSelect} from '@/shared/components/FilterPills';
import {
  useReportBreakdownQuery,
  useReportSummaryQuery,
  useReportTimeseriesQuery
} from '@/lib/hooks/report/useReport';
import {
  formatBucketLabel,
  formatCompactPeso,
  formatNumber,
  formatPeso,
  ReportBody,
  ReportCard,
  ReportKpiGrid,
  ReportNote,
  selectKpis
} from './reportPrimitives';
import {ReportBreakdownTable, breakdownToCsvRows} from './ReportBreakdownTable';
import {ReportExportBar} from './ReportExportBar';
import {ValueSplitPanel} from './ValueSplitPanel';
import type {ReportDimension, ReportGranularity, ReportRange} from '@/lib/types/report';

const SLICE_COLORS = ['#2D4A1E', '#4A7C35', '#7BAF5A', '#A8CC8C', '#D4A843', '#E8C87A', '#C9B99A', '#E5DDD0'];

const SALES_CARDS = [
  {key: 'aov', label: 'Avg Order Value'},
  {key: 'units', label: 'Units Sold'},
  {key: 'deliveryFees', label: 'Delivery Fees'},
  {key: 'discount', label: 'Discount Given'}
] as const;

const GROUPABLE: ReadonlyArray<{value: ReportDimension; label: string}> = [
  {value: 'product', label: 'Product'},
  {value: 'category', label: 'Category'},
  {value: 'paymentMethod', label: 'Payment method'},
  {value: 'orderType', label: 'Order type'},
  {value: 'orderSource', label: 'Order source'}
];

function TrendTooltip({
  active,
  payload,
  label,
  granularity
}: {
  active?: boolean;
  payload?: Array<{name?: string; value: number; color?: string}>;
  label?: string;
  granularity: ReportGranularity;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1A1A1A] px-3 py-2 text-xs text-white shadow-lg">
      <p className="font-medium">{formatBucketLabel(String(label), granularity)}</p>
      {payload.map(entry => (
        <p key={entry.name} className="text-white/90">
          {entry.name}: {entry.name === 'Orders' ? formatNumber(entry.value) : formatPeso(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function SalesReportView({range}: {range: ReportRange}) {
  const [granularity, setGranularity] = useState<ReportGranularity | undefined>(undefined);
  const [dimension, setDimension] = useState<ReportDimension>('product');

  const summaryQuery = useReportSummaryQuery(range);
  const trendQuery = useReportTimeseriesQuery(range, granularity);
  const breakdownQuery = useReportBreakdownQuery(range, dimension, 12);

  const summary = summaryQuery.data;
  const points = trendQuery.data?.points ?? [];
  const effectiveGranularity = trendQuery.data?.granularity ?? 'day';
  const breakdown = breakdownQuery.data;

  const csvRows = useMemo(() => breakdownToCsvRows(breakdown?.rows ?? []), [breakdown?.rows]);

  const orderTypeMix = summary?.byOrderType ?? [];
  const orderSourceMix = summary?.byOrderSource ?? [];

  return (
    <div className="space-y-4">
      <ReportKpiGrid
        kpis={selectKpis(summary?.kpis ?? [], SALES_CARDS)}
        isLoading={summaryQuery.isLoading}
        skeletonCards={SALES_CARDS}
      />

      <ReportCard
        title="Order value reconciliation"
        subtitle="Collected revenue vs what is still unfulfilled"
      >
        <ValueSplitPanel summary={summary} />
      </ReportCard>
      <ReportCard
        title="Revenue trend"
        subtitle={
          summaryQuery.isLoading || trendQuery.isLoading
            ? undefined
            : `${summary?.comparisonLabel ?? 'Current period'} · ${summary?.range.label ?? ''} · collected vs still open`
        }
        action={
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-0.5">
              {([undefined, 'day', 'week', 'month'] as const).map(g => {
                const active = granularity === g;
                return (
                  <button
                    key={g ?? 'auto'}
                    type="button"
                    onClick={() => setGranularity(g)}
                    aria-pressed={active}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[0.7rem] font-bold capitalize transition-colors',
                      active ? 'bg-[#2d4a35] text-white' : 'text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    {g ?? 'auto'}
                  </button>
                );
              })}
            </div>
            <ReportExportBar
              view="sales"
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
          </div>
        }
      >
        <div className="px-2 pb-4">
          <ReportBody
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
            isEmpty={points.length === 0}
            height={240}
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={points} margin={{top: 5, right: 10, left: -20, bottom: 0}}>
                <defs>
                  <linearGradient id="reportSalesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E8F0E3" />
                    <stop offset="100%" stopColor="#E8F0E3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{fontSize: 11, fill: '#6B7280'}}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => formatBucketLabel(v, effectiveGranularity)}
                  minTickGap={24}
                />
                <YAxis
                  tick={{fontSize: 11, fill: '#6B7280'}}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactPeso(v)}
                />
                <Tooltip content={<TrendTooltip granularity={effectiveGranularity} />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Collected"
                  stroke="#4A7C35"
                  strokeWidth={2}
                  fill="url(#reportSalesGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="openRevenue"
                  name="Still open"
                  stroke="#D4A843"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ReportBody>
        </div>
      </ReportCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard title="Orders per period" subtitle="Order volume trend">
          <div className="px-2 pb-4">
            <ReportBody
              isLoading={trendQuery.isLoading}
              isError={trendQuery.isError}
              isEmpty={points.length === 0}
              height={200}
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={points} margin={{top: 5, right: 10, left: -25, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{fontSize: 11, fill: '#6B7280'}}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => formatBucketLabel(v, effectiveGranularity)}
                    minTickGap={24}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{fontSize: 11, fill: '#6B7280'}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<TrendTooltip granularity={effectiveGranularity} />} />
                  <Line
                    type="stepAfter"
                    dataKey="orders"
                    name="Orders"
                    stroke="#2D4A1E"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ReportBody>
          </div>
        </ReportCard>

        <ReportCard title="Order type mix" subtitle="Where revenue comes from">
          <div className="px-4 pb-4">
            <ReportBody
              isLoading={summaryQuery.isLoading}
              isError={summaryQuery.isError}
              isEmpty={orderTypeMix.length === 0}
              height={200}
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderTypeMix}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={84}
                        dataKey="revenue"
                        nameKey="label"
                        stroke="none"
                      >
                        {orderTypeMix.map((entry, idx) => (
                          <Cell key={entry.key} fill={SLICE_COLORS[idx % SLICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatPeso(value)}
                        contentStyle={{
                          borderRadius: 8,
                          border: '1px solid #E5E7EB',
                          fontSize: 12
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-1.5">
                  {orderTypeMix.map((entry, idx) => (
                    <li key={entry.key} className="flex items-center gap-2 text-[0.8rem]">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{backgroundColor: SLICE_COLORS[idx % SLICE_COLORS.length]}}
                      />
                      <span className="min-w-0 flex-1 truncate text-[#1A1A1A]">{entry.label}</span>
                      <span className="tabular-nums text-[#6B7280]">{entry.orders}</span>
                      <span className="w-20 text-right font-medium tabular-nums text-[#1A1A1A]">
                        {formatCompactPeso(entry.revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </ReportBody>
          </div>
        </ReportCard>
      </div>

      <ReportCard
        title="Revenue breakdown"
        subtitle={breakdownQuery.isLoading ? undefined : breakdown?.note ?? 'Ranked by revenue'}
        action={
          <FilterSelect
            value={dimension}
            onChange={next => setDimension(next as ReportDimension)}
            options={GROUPABLE}
            ariaLabel="Group revenue by"
            className="w-44"
          />
        }
      >
        <ReportBreakdownTable
          rows={breakdown?.rows ?? []}
          columns={
            dimension === 'product'
              ? ['label', 'secondary', 'units', 'orders', 'revenue', 'share']
              : ['label', 'orders', 'revenue', 'share']
          }
          rank
          isLoading={breakdownQuery.isLoading}
          isError={breakdownQuery.isError}
        />
        {breakdown?.note && <ReportNote>{breakdown.note}</ReportNote>}
      </ReportCard>

      {orderSourceMix.length > 0 && (
        <ReportCard title="Order source" subtitle="How customers ordered">
          <div className="px-4 pb-5">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={orderSourceMix} margin={{top: 5, right: 10, left: -20, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{fontSize: 11, fill: '#6B7280'}}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{fontSize: 11, fill: '#6B7280'}}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCompactPeso(v)}
                />
                <Tooltip
                  formatter={(value: number) => formatPeso(value)}
                  contentStyle={{borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12}}
                />
                <Bar dataKey="revenue" name="Revenue" fill="#4A7C35" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ReportCard>
      )}
    </div>
  );
}
