'use client';

import Link from 'next/link';
import {ChevronRight} from 'lucide-react';
import {
  useReportBreakdownQuery,
  useReportOperationsQuery,
  useReportSummaryQuery,
  useReportTimeseriesQuery
} from '@/lib/hooks/report/useReport';
import {
  formatCompactPeso,
  formatNumber,
  formatPeso,
  ReportBody,
  ReportCard,
  ReportKpiGrid,
  ReportNote,
  titleCaseStatus
} from './reportPrimitives';
import {ReportBreakdownTable} from './ReportBreakdownTable';
import {SalesSparkline} from './SalesSparkline';
import {ValueSplitPanel} from './ValueSplitPanel';
import type {ReportRange, ReportView} from '@/lib/types/report';

/** Below this many measured orders an on-time rate is noise, not a signal. */
const MIN_FULFILMENT_SAMPLE = 5;

function MiniStat({label, value, hint}: {label: string; value: string; hint?: string}) {
  return (
    <div className="rounded-lg bg-[#F7FAF6] px-3 py-2.5">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">{label}</p>
      <p className="mt-0.5 text-[1.05rem] font-bold tabular-nums text-[#1A1A1A]">{value}</p>
      {hint && <p className="mt-0.5 text-[0.68rem] text-[#6B7280]">{hint}</p>}
    </div>
  );
}

function goToReportsLink(view: ReportView) {
  return `/owner/dashboard?view=${view}`;
}

/** At-a-glance landing view: headline KPIs plus a nudge into each detail view. */
export function OverviewReportView({range}: {range: ReportRange}) {
  const summaryQuery = useReportSummaryQuery(range);
  const trendQuery = useReportTimeseriesQuery(range);
  const operationsQuery = useReportOperationsQuery(range);
  const topProductsQuery = useReportBreakdownQuery(range, 'product', 5);
  const topCustomersQuery = useReportBreakdownQuery(range, 'customer', 5);

  const summary = summaryQuery.data;
  const ops = operationsQuery.data;

  return (
    <div className="space-y-4">
      <ReportKpiGrid kpis={summary?.kpis ?? []} />

      <ReportCard
        title="Where the money is"
        subtitle="Collected vs still open"
        action={
          <Link
            href={goToReportsLink('sales')}
            className="flex items-center gap-0.5 text-[0.8rem] font-semibold text-[#2d4a35] hover:underline"
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <ValueSplitPanel summary={summary} />
      </ReportCard>

      <ReportCard
        title="Revenue trend"
        subtitle={`${summary?.range.label ?? ''} · collected only`}
        action={
          <Link
            href={goToReportsLink('sales')}
            className="flex items-center gap-0.5 text-[0.8rem] font-semibold text-[#2d4a35] hover:underline"
          >
            Details <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="px-3 pb-4">
          <ReportBody
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
            isEmpty={(trendQuery.data?.points.length ?? 0) === 0}
            height={180}
          >
            <SalesSparkline points={trendQuery.data?.points ?? []} granularity={trendQuery.data?.granularity ?? 'day'} />
          </ReportBody>
        </div>
      </ReportCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          title="Needs attention"
          subtitle="Live kitchen and cancellation signals"
          action={
            <Link
              href={goToReportsLink('operations')}
              className="flex items-center gap-0.5 text-[0.8rem] font-semibold text-[#2d4a35] hover:underline"
            >
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <MiniStat
              label="In the kitchen"
              value={formatNumber(ops?.live.preparing ?? 0)}
              hint={`${formatNumber(ops?.live.open ?? 0)} open in total`}
            />
            <MiniStat
              label="Stuck orders"
              value={formatNumber(ops?.staleOrders.count ?? 0)}
              hint={
                ops
                  ? ops.staleOrders.count
                    ? `${formatPeso(ops.staleOrders.value)} · oldest ${formatNumber(ops.staleOrders.oldestDays ?? 0)}d`
                    : `Nothing open ${formatNumber(ops.staleOrders.afterDays)}d+`
                  : undefined
              }
            />
            <MiniStat
              label="Cancellations"
              value={ops ? `${formatNumber(Math.round(ops.cancellations.rate * 10) / 10)}%` : '—'}
              hint={ops ? `${formatNumber(ops.cancellations.cancelled)} of ${formatNumber(ops.cancellations.total)}` : undefined}
            />
            <MiniStat
              label="On-time prep"
              value={
                ops
                  ? ops.fulfilment.measured >= MIN_FULFILMENT_SAMPLE
                    ? `${formatNumber(Math.round(ops.fulfilment.onTimeRate))}%`
                    : 'No data'
                  : '—'
              }
              hint={
                ops
                  ? ops.fulfilment.measured >= MIN_FULFILMENT_SAMPLE
                    ? `${formatNumber(ops.fulfilment.measured)} orders measured`
                    : 'Prep times are not being recorded'
                  : undefined
              }
            />
            <MiniStat
              label="Repeat customers"
              value={
                summary ? `${formatNumber(Math.round(summary.customerMix.repeatRate))}%` : '—'
              }
              hint={summary ? `${formatNumber(summary.customerMix.repeat)} of ${formatNumber(summary.customerMix.unique)}` : undefined}
            />
            <MiniStat
              label="Avg order"
              value={formatPeso(
                summary?.kpis.find(kpi => kpi.key === 'aov')?.value ?? 0
              )}
              hint="On completed orders"
            />
          </div>
          {ops && ops.staleOrders.count > 0 && (
            <ReportNote>
              <span className="font-semibold text-[#B45309]">
                {formatNumber(ops.staleOrders.count)} orders worth{' '}
                {formatPeso(ops.staleOrders.value)} have been open {formatNumber(ops.staleOrders.afterDays)}+ days
                without being completed or cancelled.
              </span>{' '}
              They are counted in &ldquo;open&rdquo; but never as revenue.
            </ReportNote>
          )}
          {ops && ops.staleOrders.count === 0 && ops.fulfilment.measured < MIN_FULFILMENT_SAMPLE && (
            <ReportNote>
              Kitchen prep times are not being recorded, so on-time rate cannot be measured.
            </ReportNote>
          )}
        </ReportCard>

        <ReportCard
          title="Order channels"
          subtitle={summary?.comparisonLabel}
        >
          <div className="space-y-2.5 px-5 pb-5">
            {(summary?.byOrderType ?? []).map(row => {
              const typeTotal = (summary?.byOrderType ?? []).reduce((s, r) => s + r.revenue, 0);
              return (
                <div key={row.key}>
                  <div className="mb-1 flex items-center justify-between text-[0.82rem]">
                    <span className="text-[#1A1A1A]">{row.label}</span>
                    <span className="tabular-nums text-[#6B7280]">
                      {formatNumber(row.orders)} · {formatCompactPeso(row.revenue)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F6F1]">
                    <div
                      className="h-full rounded-full bg-[#4A7C35] transition-all"
                      style={{width: `${typeTotal > 0 ? (row.revenue / typeTotal) * 100 : 0}%`}}
                    />
                  </div>
                </div>
              );
            })}
            {(summary?.byOrderType.length ?? 0) === 0 && !summaryQuery.isLoading && (
              <p className="py-6 text-center text-sm text-[#6B7280]">No orders in this period</p>
            )}
          </div>
        </ReportCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          title="Top products"
          subtitle={`${formatNumber(topProductsQuery.data?.total.units ?? 0)} units · ${formatPeso(topProductsQuery.data?.total.revenue ?? 0)}`}
          action={
            <Link
              href={goToReportsLink('products')}
              className="flex items-center gap-0.5 text-[0.8rem] font-semibold text-[#2d4a35] hover:underline"
            >
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ReportBreakdownTable
            rows={topProductsQuery.data?.rows ?? []}
            columns={['label', 'units', 'revenue']}
            showTotals={false}
            isLoading={topProductsQuery.isLoading}
            isError={topProductsQuery.isError}
          />
          {topProductsQuery.data?.note && <ReportNote>{topProductsQuery.data.note}</ReportNote>}
        </ReportCard>

        <ReportCard
          title="Top customers"
          subtitle="By revenue in this period"
          action={
            <Link
              href={goToReportsLink('customers')}
              className="flex items-center gap-0.5 text-[0.8rem] font-semibold text-[#2d4a35] hover:underline"
            >
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <ReportBreakdownTable
            rows={topCustomersQuery.data?.rows ?? []}
            columns={['label', 'orders', 'revenue']}
            showTotals={false}
            isLoading={topCustomersQuery.isLoading}
            isError={topCustomersQuery.isError}
          />
        </ReportCard>
      </div>
    </div>
  );
}
