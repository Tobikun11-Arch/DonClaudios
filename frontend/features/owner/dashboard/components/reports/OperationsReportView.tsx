'use client';

import {useMemo} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  useReportBreakdownQuery,
  useReportOperationsQuery,
  useReportSummaryQuery
} from '@/lib/hooks/report/useReport';
import {
  formatHour,
  formatNumber,
  formatPeso,
  ReportBody,
  ReportCard,
  ReportKpiGrid,
  ReportNote,
  ShareBar,
  titleCaseStatus
} from './reportPrimitives';
import {ReportBreakdownTable, breakdownToCsvRows} from './ReportBreakdownTable';
import {ReportExportBar} from './ReportExportBar';
import type {ReportRange} from '@/lib/types/report';

const FUNNEL_COLORS: Record<string, string> = {
  pending: '#A8CC8C',
  confirmed: '#7BAF5A',
  preparing: '#D4A843',
  ready: '#4A7C35',
  on_the_way: '#2D4A1E',
  completed: '#2d4a35',
  cancelled: '#E58A8A'
};

export function OperationsReportView({range}: {range: ReportRange}) {
  const opsQuery = useReportOperationsQuery(range);
  const summaryQuery = useReportSummaryQuery(range);
  const cashierQuery = useReportBreakdownQuery(range, 'cashier', 12);

  const ops = opsQuery.data;
  const summary = summaryQuery.data;
  const kpis = summary?.kpis ?? [];

  const funnel = useMemo(
    () =>
      [...(ops?.statusFunnel ?? [])].sort((a, b) => {
        // Present the happy path top-to-bottom rather than by raw count.
        const order = [
          'pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'completed', 'cancelled'
        ];
        return order.indexOf(a.status) - order.indexOf(b.status);
      }),
    [ops?.statusFunnel]
  );

  const maxFunnel = Math.max(1, ...funnel.map(f => f.count));
  const peakHour = ops?.byHour.reduce(
    (best, hour) => (hour.orders > (best?.orders ?? 0) ? hour : best),
    ops?.byHour[0]
  );

  const csvRows = useMemo(() => breakdownToCsvRows(cashierQuery.data?.rows ?? []), [cashierQuery.data]);

  return (
    <div className="space-y-4">
      <ReportKpiGrid kpis={kpis.slice(0, 4)} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          {label: 'Open orders', value: ops?.live.open, hint: 'includes stuck'},
          {label: 'In the kitchen', value: ops?.live.preparing, hint: 'actually cooking'},
          {label: 'Deliveries today', value: ops?.live.deliveriesToday, hint: ''},
          {label: 'Pickups today', value: ops?.live.pickupsToday, hint: ''},
          {label: 'Reservations', value: ops?.live.reservationsOpen, hint: ''}
        ].map(tile => (
          <div
            key={tile.label}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
          >
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
              {tile.label}
            </p>
            <p className="mt-1 text-[1.35rem] font-bold leading-none tabular-nums text-[#1A1A1A]">
              {opsQuery.isLoading ? '—' : formatNumber(tile.value ?? 0)}
            </p>
            {tile.hint && <p className="mt-1 text-[0.65rem] text-[#9CA3AF]">{tile.hint}</p>}
          </div>
        ))}
      </div>

      {ops && ops.staleOrders.count > 0 && (
        <ReportCard
          title="Stuck orders"
          subtitle={`Open ${formatNumber(ops.staleOrders.afterDays)}+ days, never completed or cancelled`}
        >
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-3">
            <div className="rounded-lg border border-[#F0D9A8] bg-[#FDF8EE] px-3.5 py-3">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#8A6A2B]">
                Value at risk
              </p>
              <p className="mt-1 text-[1.3rem] font-bold leading-none tabular-nums text-[#1A1A1A]">
                {formatPeso(ops.staleOrders.value)}
              </p>
              <p className="mt-1 text-[0.7rem] text-[#6B7280]">
                {formatNumber(ops.staleOrders.count)} orders · oldest{' '}
                {formatNumber(ops.staleOrders.oldestDays ?? 0)} days
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                By age
              </p>
              <div className="space-y-1.5">
                {ops.staleOrders.byAge
                  .filter(bucket => bucket.count > 0)
                  .map(bucket => {
                    const max = Math.max(
                      1,
                      ...ops.staleOrders.byAge.map(b => b.count)
                    );
                    return (
                      <div key={bucket.label}>
                        <div className="mb-0.5 flex items-center justify-between text-[0.78rem]">
                          <span className="text-[#1A1A1A]">{bucket.label}</span>
                          <span className="tabular-nums text-[#6B7280]">
                            {formatNumber(bucket.count)} · {formatPeso(bucket.value)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F7F2E7]">
                          <div
                            className="h-full rounded-full bg-[#D4A843]"
                            style={{width: `${(bucket.count / max) * 100}%`}}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
          <ReportNote>
            These orders sit in the &ldquo;open&rdquo; count but are never counted as revenue, because
            nothing closes them automatically. By type:{' '}
            {ops.staleOrders.byType
              .map(t => `${t.label} ${formatNumber(t.count)}`)
              .join(' · ') || 'none'}.
          </ReportNote>
        </ReportCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard title="Order status mix" subtitle="Every order that entered the period">
          <div className="space-y-2.5 px-5 pb-5">
            <ReportBody
              isLoading={opsQuery.isLoading}
              isError={opsQuery.isError}
              isEmpty={funnel.length === 0}
              height={160}
            >
              {funnel.map(entry => (
                <div key={entry.status}>
                  <div className="mb-1 flex items-center justify-between text-[0.8rem]">
                    <span className="font-medium text-[#1A1A1A]">
                      {titleCaseStatus(entry.status)}
                    </span>
                    <span className="tabular-nums text-[#6B7280]">{formatNumber(entry.count)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F3F6F1]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(entry.count / maxFunnel) * 100}%`,
                        backgroundColor: FUNNEL_COLORS[entry.status] ?? '#4A7C35'
                      }}
                    />
                  </div>
                </div>
              ))}
            </ReportBody>
          </div>
        </ReportCard>

        <ReportCard
          title="Kitchen performance"
          subtitle="Prep time actually taken vs promised"
        >
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            {[
              {label: 'On-time rate', value: ops ? `${formatNumber(Math.round(ops.fulfilment.onTimeRate))}%` : '—'},
              {label: 'Orders measured', value: ops ? formatNumber(ops.fulfilment.measured) : '—'},
              {label: 'Avg actual', value: ops ? `${formatNumber(ops.fulfilment.avgActualMinutes)} min` : '—'},
              {label: 'Avg promised', value: ops ? `${formatNumber(ops.fulfilment.avgPromisedMinutes)} min` : '—'}
            ].map(tile => (
              <div key={tile.label} className="rounded-lg bg-[#F7FAF6] px-3 py-2.5">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                  {tile.label}
                </p>
                <p className="mt-0.5 text-[1.05rem] font-bold tabular-nums text-[#1A1A1A]">
                  {tile.value}
                </p>
              </div>
            ))}
            <p className="col-span-2 text-[0.72rem] leading-relaxed text-[#6B7280]">
              Measured from the kitchen-done status in the order timeline, so it only counts
              orders that were actually prepared in this window.
            </p>
          </div>
        </ReportCard>
      </div>

      <ReportCard
        title="Cancellations"
        subtitle={
          ops
            ? `${formatNumber(ops.cancellations.cancelled)} of ${formatNumber(ops.cancellations.total)} orders · ${formatNumber(Math.round(ops.cancellations.rate * 10) / 10)}%`
            : 'Loading…'
        }
      >
        <div className="px-5 pb-5">
          <ReportBody
            isLoading={opsQuery.isLoading}
            isError={opsQuery.isError}
            isEmpty={(ops?.cancellations.reasons.length ?? 0) === 0}
            emptyMessage="No cancellations in this period"
            height={120}
          >
            <ul className="space-y-2">
              {(ops?.cancellations.reasons ?? []).map(reason => {
                const pct =
                  ops && ops.cancellations.cancelled > 0
                    ? (reason.count / ops.cancellations.cancelled) * 100
                    : 0;
                return (
                  <li key={reason.reason}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-[0.82rem]">
                      <span className="truncate text-[#1A1A1A]">{reason.reason}</span>
                      <span className="shrink-0 tabular-nums text-[#6B7280]">
                        {formatNumber(reason.count)} · {formatNumber(Math.round(pct))}%
                      </span>
                    </div>
                    <ShareBar share={pct} color="#E58A8A" />
                  </li>
                );
              })}
            </ul>
          </ReportBody>
        </div>
      </ReportCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          title="Busiest hours"
          subtitle={peakHour ? `Peak at ${formatHour(peakHour.hour)}` : 'Order volume by hour'}
        >
          <div className="px-2 pb-4">
            <ReportBody
              isLoading={opsQuery.isLoading}
              isError={opsQuery.isError}
              isEmpty={(ops?.byHour.length ?? 0) === 0}
              height={200}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ops?.byHour ?? []} margin={{top: 5, right: 10, left: -25, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{fontSize: 10, fill: '#6B7280'}}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                    tickFormatter={formatHour}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{fontSize: 11, fill: '#6B7280'}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    labelFormatter={(h: number) => formatHour(h)}
                    formatter={(value: number) => [formatNumber(value), 'Orders']}
                    contentStyle={{borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12}}
                  />
                  <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
                    {(ops?.byHour ?? []).map(hour => (
                      <Cell
                        key={hour.hour}
                        fill={hour.orders === peakHour?.hour ? '#2D4A1E' : '#7BAF5A'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ReportBody>
          </div>
        </ReportCard>

        <ReportCard title="Busiest days" subtitle="Order volume by weekday">
          <div className="px-2 pb-4">
            <ReportBody
              isLoading={opsQuery.isLoading}
              isError={opsQuery.isError}
              isEmpty={(ops?.byWeekday.length ?? 0) === 0}
              height={200}
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ops?.byWeekday ?? []} margin={{top: 5, right: 10, left: -25, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{fontSize: 11, fill: '#6B7280'}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{fontSize: 11, fill: '#6B7280'}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), 'Orders']}
                    contentStyle={{borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12}}
                  />
                  <Bar dataKey="orders" name="Orders" fill="#4A7C35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ReportBody>
          </div>
        </ReportCard>
      </div>

      <ReportCard
        title="Sales by cashier"
        subtitle="Online payments are collected without a cashier"
        action={
          <ReportExportBar
            view="operations"
            range={range}
            rows={csvRows}
            columns={[
              {header: 'Cashier', value: r => r.name},
              {header: 'Orders', value: r => r.orders},
              {header: 'Revenue', value: r => r.revenue},
              {header: 'Share %', value: r => r.sharePercent}
            ]}
          />
        }
      >
        <ReportBreakdownTable
          rows={cashierQuery.data?.rows ?? []}
          columns={['label', 'orders', 'revenue', 'share']}
          rank
          isLoading={cashierQuery.isLoading}
          isError={cashierQuery.isError}
          emptyMessage="No cashier-attributed sales in this period"
        />
        <ReportNote>
          Online orders are paid online and have no cashier, so they are listed as a single
          “Online” row. This keeps the total equal to the period revenue.
        </ReportNote>
      </ReportCard>
    </div>
  );
}
