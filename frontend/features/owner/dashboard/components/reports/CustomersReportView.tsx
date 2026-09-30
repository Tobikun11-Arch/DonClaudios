'use client';

import {useMemo, useState} from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import {useReportBreakdownQuery, useReportSummaryQuery} from '@/lib/hooks/report/useReport';
import {
  formatNumber,
  formatPeso,
  ReportBody,
  ReportCard,
  ReportKpiGrid,
  ReportNote
} from './reportPrimitives';
import {ReportBreakdownTable, breakdownToCsvRows} from './ReportBreakdownTable';
import {ReportExportBar} from './ReportExportBar';
import type {ReportRange} from '@/lib/types/report';

const GUEST_COLOR = '#E5DDD0';
const MEMBER_COLOR = '#4A7C35';
const NEW_COLOR = '#A8CC8C';

export function CustomersReportView({range}: {range: ReportRange}) {
  const [dimension, setDimension] = useState<'customer' | 'paymentMethod'>('customer');
  const summaryQuery = useReportSummaryQuery(range);
  const breakdownQuery = useReportBreakdownQuery(range, dimension, 15);

  const summary = summaryQuery.data;
  const mix = summary?.customerMix;
  const breakdown = breakdownQuery.data;

  const csvRows = useMemo(() => breakdownToCsvRows(breakdown?.rows ?? []), [breakdown?.rows]);

  const mixData = mix
    ? [
        {key: 'registered', label: 'Registered', value: mix.registeredOrders, color: MEMBER_COLOR},
        {key: 'guest', label: 'Guest', value: mix.guestOrders, color: GUEST_COLOR}
      ].filter(entry => entry.value > 0)
    : [];

  const repeatSplit = mix
    ? [
        {key: 'repeat', label: 'Repeat', value: mix.repeat, color: MEMBER_COLOR},
        {key: 'new', label: 'New', value: mix.newCustomers, color: NEW_COLOR}
      ].filter(entry => entry.value > 0)
    : [];

  return (
    <div className="space-y-4">
      <ReportKpiGrid kpis={summary?.kpis ?? []} columns={3} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReportCard
          title="Guest vs registered"
          subtitle={`${formatNumber(mix?.unique ?? 0)} unique customers in this period`}
        >
          <div className="px-4 pb-5">
            <ReportBody
              isLoading={summaryQuery.isLoading}
              isError={summaryQuery.isError}
              isEmpty={mixData.length === 0}
              height={200}
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mixData}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={86}
                        dataKey="value"
                        nameKey="label"
                        stroke="none"
                      >
                        {mixData.map(entry => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatNumber(value), 'Orders']}
                        contentStyle={{borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-2">
                  {mixData.map(entry => (
                    <li key={entry.key} className="flex items-center gap-2 text-[0.82rem]">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{backgroundColor: entry.color}}
                      />
                      <span className="flex-1 text-[#1A1A1A]">{entry.label}</span>
                      <span className="font-medium tabular-nums text-[#1A1A1A]">
                        {formatNumber(entry.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </ReportBody>
          </div>
        </ReportCard>

        <ReportCard
          title="Retention"
          subtitle="Share of customers who came back"
          action={
            mix ? (
              <span className="rounded-full bg-[#E8F0E3] px-3 py-1 text-sm font-bold tabular-nums text-[#2D4A1E]">
                {formatNumber(Math.round(mix.repeatRate))}% repeat
              </span>
            ) : null
          }
        >
          <div className="px-4 pb-5">
            <ReportBody
              isLoading={summaryQuery.isLoading}
              isError={summaryQuery.isError}
              isEmpty={repeatSplit.length === 0}
              height={200}
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={repeatSplit}
                        cx="50%"
                        cy="50%"
                        innerRadius={54}
                        outerRadius={86}
                        dataKey="value"
                        nameKey="label"
                        stroke="none"
                      >
                        {repeatSplit.map(entry => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [formatNumber(value), 'Customers']}
                        contentStyle={{borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12}}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-2">
                  {repeatSplit.map(entry => (
                    <li key={entry.key} className="flex items-center gap-2 text-[0.82rem]">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{backgroundColor: entry.color}}
                      />
                      <span className="flex-1 text-[#1A1A1A]">{entry.label}</span>
                      <span className="font-medium tabular-nums text-[#1A1A1A]">
                        {formatNumber(entry.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </ReportBody>
            <ReportNote>
              A customer counts as repeat only if they had an earlier order before this period
              started, so this is not inflated by repeat visits inside the window.
            </ReportNote>
          </div>
        </ReportCard>
      </div>

      <ReportCard
        title={dimension === 'customer' ? 'Top customers' : 'Payment methods'}
        subtitle={
          dimension === 'customer'
            ? 'Guest orders are grouped as a single row'
            : 'How customers paid'
        }
        action={
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-full border border-gray-200 bg-white p-0.5">
              {(['customer', 'paymentMethod'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDimension(value)}
                  className={
                    dimension === value
                      ? 'rounded-full bg-[#2d4a35] px-3 py-1 text-[0.7rem] font-bold text-white'
                      : 'rounded-full px-3 py-1 text-[0.7rem] font-bold text-gray-500 hover:bg-gray-50'
                  }
                >
                  {value === 'customer' ? 'Customers' : 'Payment'}
                </button>
              ))}
            </div>
            <ReportExportBar
              view="customers"
              range={range}
              rows={csvRows}
              columns={[
                {header: 'Name', value: r => r.name},
                {header: 'Orders', value: r => r.orders},
                {header: 'Revenue', value: r => r.revenue},
                {header: 'Share %', value: r => r.sharePercent}
              ]}
            />
          </div>
        }
      >
        <ReportBreakdownTable
          rows={breakdown?.rows ?? []}
          columns={['label', 'orders', 'revenue', 'share']}
          rank
          isLoading={breakdownQuery.isLoading}
          isError={breakdownQuery.isError}
        />
        {dimension === 'customer' && (
          <ReportNote>
            Guest checkouts are not tied to a customer record, so they appear as one combined
            “Guest” row. Revenue by customer can therefore be lower than total revenue only if
            every guest order is in that row.
          </ReportNote>
        )}
      </ReportCard>

      {mix && (
        <ReportCard title="Customer mix at a glance">
          <div className="grid grid-cols-2 gap-3 px-5 pb-5 lg:grid-cols-4">
            {[
              {label: 'Unique customers', value: formatNumber(mix.unique)},
              {label: 'Repeat customers', value: formatNumber(mix.repeat)},
              {label: 'New sign-ups', value: formatNumber(mix.newCustomers)},
              {
                label: 'Avg revenue / customer',
                value: formatPeso(
                  mix.unique > 0
                    ? (summary?.kpis.find(k => k.key === 'revenue')?.value ?? 0) / mix.unique
                    : 0
                )
              }
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
          </div>
        </ReportCard>
      )}
    </div>
  );
}
