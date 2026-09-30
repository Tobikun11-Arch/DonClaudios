'use client';

import {useMemo} from 'react';
import Link from 'next/link';
import {AlertTriangle, ChevronRight, CircleCheck} from 'lucide-react';
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
  selectKpis
} from './reportPrimitives';
import {ReportBreakdownTable} from './ReportBreakdownTable';
import {SalesSparkline} from './SalesSparkline';
import {ValueSplitPanel} from './ValueSplitPanel';
import type {ReportKpi, ReportOperations, ReportRange, ReportView} from '@/lib/types/report';

/** Below this many measured orders an on-time rate is noise, not a signal. */
const MIN_FULFILMENT_SAMPLE = 5;

/** Prep slower than this share of the time is worth surfacing. */
const ON_TIME_TARGET = 90;

/** Worst-first cap, so the card stays scannable instead of becoming a second grid. */
const MAX_EXCEPTIONS = 3;

const OVERVIEW_CARDS = [
  {key: 'revenue', label: 'Revenue Collected'},
  {key: 'openValue', label: 'Still Open'},
  {key: 'orders', label: 'Orders Completed'},
  {key: 'cancellationRate', label: 'Cancellation Rate'}
] as const;

type Exception = {
  severity: number;
  tone: 'danger' | 'warning';
  message: string;
};

/**
 * Derives only the things that are actually wrong right now. The numbers
 * themselves live on Operations, so each row just points there instead of
 * repeating them. Returns an empty list when the period is healthy.
 */
function buildExceptions(
  ops: ReportOperations | undefined,
  cancellationDelta: number | null | undefined
): Exception[] {
  if (!ops) return [];
  const found: Exception[] = [];

  if (ops.staleOrders.count > 0) {
    found.push({
      severity: 3,
      tone: 'danger',
      message: `${formatNumber(ops.staleOrders.count)} order${
        ops.staleOrders.count === 1 ? '' : 's'
      } stuck ${formatNumber(ops.staleOrders.afterDays)}+ days (${formatPeso(
        ops.staleOrders.value
      )} at risk)`
    });
  }

  if (ops.fulfilment.measured >= MIN_FULFILMENT_SAMPLE) {
    if (ops.fulfilment.onTimeRate < ON_TIME_TARGET) {
      found.push({
        severity: 2,
        tone: 'warning',
        message: `Prep running late — avg ${formatNumber(
          ops.fulfilment.avgActualMinutes
        )} min against ${formatNumber(ops.fulfilment.avgPromisedMinutes)} promised (${formatNumber(
          Math.round(ops.fulfilment.onTimeRate)
        )}% on time)`
      });
    }
  } else {
    found.push({
      severity: 1,
      tone: 'warning',
      message: 'Kitchen prep times are not being recorded, so on-time rate cannot be measured'
    });
  }

  // Only meaningful against a real baseline; a first-ever period has none.
  if (typeof cancellationDelta === 'number' && cancellationDelta >= 25) {
    found.push({
      severity: 2,
      tone: 'warning',
      message: `Cancellations up ${formatNumber(
        Math.round(cancellationDelta)
      )}% versus the previous period`
    });
  }

  const stillOpen = ops.live.open - ops.staleOrders.count;
  if (stillOpen > 0) {
    found.push({
      severity: 1,
      tone: 'warning',
      message: `${formatNumber(stillOpen)} order${stillOpen === 1 ? '' : 's'} still open and within the normal window`
    });
  }

  return found.sort((a, b) => b.severity - a.severity).slice(0, MAX_EXCEPTIONS);
}

function goToReportsLink(view: ReportView) {
  return `/owner/dashboard?view=${view}`;
}

function DetailsLink({view}: {view: ReportView}) {
  return (
    <Link
      href={goToReportsLink(view)}
      className="flex items-center gap-0.5 text-[0.8rem] font-semibold text-[#2d4a35] hover:underline"
    >
      Details <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

/** At-a-glance landing view: headline KPIs, plus a nudge into each detail view. */
export function OverviewReportView({range}: {range: ReportRange}) {
  const summaryQuery = useReportSummaryQuery(range);
  const trendQuery = useReportTimeseriesQuery(range);
  const operationsQuery = useReportOperationsQuery(range);
  const topProductsQuery = useReportBreakdownQuery(range, 'product', 5);
  const topCustomersQuery = useReportBreakdownQuery(range, 'customer', 5);

  const summary = summaryQuery.data;
  const ops = operationsQuery.data;

  const kpis: ReportKpi[] = useMemo(
    () => selectKpis(summary?.kpis ?? [], OVERVIEW_CARDS),
    [summary?.kpis]
  );
  const cancellationDelta = useMemo(
    () => summary?.kpis.find(kpi => kpi.key === 'cancellationRate')?.delta,
    [summary?.kpis]
  );
  const exceptions = useMemo(
    () => buildExceptions(ops, cancellationDelta),
    [ops, cancellationDelta]
  );

  return (
    <div className="space-y-4">
      <ReportKpiGrid
        kpis={kpis}
        isLoading={summaryQuery.isLoading}
        skeletonCards={OVERVIEW_CARDS}
      />

      <ReportCard title="Where the money is" subtitle="Collected vs still open" action={<DetailsLink view="sales" />}>
        <ValueSplitPanel summary={summary} />
      </ReportCard>

      <ReportCard
        title="Revenue trend"
        subtitle={`${summary?.range.label ?? ''} · collected only`}
        action={<DetailsLink view="sales" />}
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
          subtitle="Only what needs acting on right now"
          action={<DetailsLink view="operations" />}
        >
          <div className="px-5 pb-4">
            {operationsQuery.isLoading ? (
              <div className="space-y-3 py-2" aria-hidden="true">
                {[0, 1, 2].map(index => (
                  <div key={index} className="flex items-center gap-2.5">
                    <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-[#E8EDE6]" />
                    <div
                      className="h-3 flex-1 animate-pulse rounded bg-[#E8EDE6]"
                      style={{maxWidth: `${85 - index * 15}%`}}
                    />
                    <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-[#E8EDE6]" />
                  </div>
                ))}
              </div>
            ) : exceptions.length === 0 ? (
              <p className="flex items-center gap-2 py-4 text-sm text-[#2D7A3A]">
                <CircleCheck className="h-4 w-4 shrink-0" />
                All clear. Nothing needs your attention.
              </p>
            ) : (
              <ul className="divide-y divide-[#E5E7EB]">
                {exceptions.map(item => (
                  <li key={item.message} className="flex items-start gap-2.5 py-2.5">
                    <AlertTriangle
                      className={
                        item.tone === 'danger'
                          ? 'mt-0.5 h-4 w-4 shrink-0 text-red-500'
                          : 'mt-0.5 h-4 w-4 shrink-0 text-[#D4A843]'
                      }
                    />
                    <span className="flex-1 text-[0.85rem] leading-snug text-[#1A1A1A]">{item.message}</span>
                    <Link
                      href={goToReportsLink('operations')}
                      className="flex shrink-0 items-center gap-0.5 text-[0.78rem] font-semibold text-[#2d4a35] hover:underline"
                    >
                      View <ChevronRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ReportCard>

        <ReportCard title="Order channels" subtitle={summary?.comparisonLabel}>
          <div className="space-y-2.5 px-5 pb-5">
            {summaryQuery.isLoading ? (
              <div className="space-y-3 pt-1" aria-hidden="true">
                {[0, 1, 2].map(index => (
                  <div key={index} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div
                        className="h-3 w-24 animate-pulse rounded bg-[#E8EDE6]"
                        style={{maxWidth: `${40 + index * 18}%`}}
                      />
                      <div className="h-3 w-20 animate-pulse rounded bg-[#E8EDE6]" />
                    </div>
                    <div className="h-2 w-full animate-pulse rounded-full bg-[#E8EDE6]" />
                  </div>
                ))}
              </div>
            ) : (
              <>
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
                {(summary?.byOrderType.length ?? 0) === 0 && (
                  <p className="py-6 text-center text-sm text-[#6B7280]">No orders in this period</p>
                )}
              </>
            )}
          </div>
        </ReportCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          title="Top products"
          subtitle={
            topProductsQuery.isLoading
              ? undefined
              : `${formatNumber(topProductsQuery.data?.total.units ?? 0)} units · ${formatPeso(topProductsQuery.data?.total.revenue ?? 0)}`
          }
          action={<DetailsLink view="products" />}
        >
          <ReportBreakdownTable
            rows={topProductsQuery.data?.rows ?? []}
            columns={['label', 'units', 'revenue']}
            showTotals={false}
            isLoading={topProductsQuery.isLoading}
            isError={topProductsQuery.isError}
          />
        </ReportCard>

        <ReportCard
          title="Top customers"
          subtitle={topCustomersQuery.isLoading ? undefined : 'By revenue in this period'}
          action={<DetailsLink view="customers" />}
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
