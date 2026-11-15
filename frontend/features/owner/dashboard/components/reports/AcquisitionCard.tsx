'use client';

import {useState} from 'react';
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from 'recharts';
import {useReportAcquisitionQuery} from '@/lib/hooks/report/useReport';
import type {ReportRange} from '@/lib/types/report';
import {formatNumber, formatPeso, ReportBody, ReportCard, ReportNote} from './reportPrimitives';
import {useChartColors} from '../chartTheme';

type Metric = 'signups' | 'orders' | 'revenue';

const METRICS: {key: Metric; label: string}[] = [
  {key: 'signups', label: 'Sign-ups'},
  {key: 'orders', label: 'Orders'},
  {key: 'revenue', label: 'Revenue'}
];

const SOURCE_COLORS: Record<string, string> = {
  facebook: '#1877F2',
  instagram: '#D62976',
  tiktok: '#14B8A6',
  google: '#F4B400',
  messenger: '#8B5CF6',
  friend: '#4A7C35',
  walk_by: '#A8CC8C',
  direct: '#94A3B8',
  other: '#CBD5E1',
  unknown: '#E5DDD0'
};

const colorFor = (key: string) => SOURCE_COLORS[key] ?? '#CBD5E1';

/** "Where customers come from": source of new sign-ups and online orders. */
export function AcquisitionCard({range}: {range: ReportRange}) {
  const chart = useChartColors();
  const [metric, setMetric] = useState<Metric>('signups');
  const query = useReportAcquisitionQuery(range);
  const data = query.data;

  const rows = data?.rows ?? [];
  const pieData = rows
    .filter(r => r[metric] > 0)
    .map(r => ({key: r.key, label: r.label, value: r[metric], color: colorFor(r.key)}));
  const total = data?.totals[metric] ?? 0;
  const fmt = (v: number) => (metric === 'revenue' ? formatPeso(v) : formatNumber(v));
  const share = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <ReportCard
      title="Where customers come from"
      subtitle={
        query.isLoading || !data
          ? undefined
          : `${formatNumber(data.totals.signups)} new sign-ups · ${formatNumber(data.totals.orders)} online orders`
      }
      action={
        <div
          role="group"
          aria-label="Measure"
          className="flex gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5"
        >
          {METRICS.map(m => (
            <button
              key={m.key}
              type="button"
              aria-pressed={metric === m.key}
              onClick={() => setMetric(m.key)}
              className={
                metric === m.key
                  ? 'rounded-full bg-[#2d4a35] px-3 py-1 text-[0.7rem] font-bold text-white'
                  : 'rounded-full px-3 py-1 text-[0.7rem] font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60'
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="px-4 pb-5">
        <ReportBody
          isLoading={query.isLoading}
          isError={query.isError}
          isEmpty={pieData.length === 0}
          emptyMessage="No customer source data for this period yet"
          height={220}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={pieData.length > 1 ? 1.5 : 0}
                    dataKey="value"
                    nameKey="label"
                    stroke="none"
                  >
                    {pieData.map(entry => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [fmt(value), METRICS.find(m => m.key === metric)?.label]}
                    contentStyle={chart.tooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold tabular-nums text-[#1A1A1A] dark:text-gray-100">
                  {fmt(total)}
                </span>
                <span className="text-[0.7rem] text-gray-500 dark:text-gray-400">
                  {METRICS.find(m => m.key === metric)?.label}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 overflow-x-auto">
              <table className="w-full text-[0.82rem]">
                <thead>
                  <tr className="text-left text-[0.7rem] font-semibold text-gray-500 dark:text-gray-400">
                    <th className="pb-2 font-semibold">Source</th>
                    <th className="pb-2 text-right font-semibold">Sign-ups</th>
                    <th className="pb-2 text-right font-semibold">Orders</th>
                    <th className="pb-2 text-right font-semibold">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map(r => (
                    <tr key={r.key} className="text-[#1A1A1A] dark:text-gray-100">
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{backgroundColor: colorFor(r.key)}}
                          />
                          <span className="truncate">{r.label}</span>
                          <span className="text-[0.7rem] tabular-nums text-gray-400">
                            {share(r[metric])}%
                          </span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(r.signups)}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(r.orders)}</td>
                      <td className="py-2 text-right tabular-nums">{formatPeso(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data && data.campaigns.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[0.7rem] font-semibold text-gray-500 dark:text-gray-400">
                    Top campaign links
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {data.campaigns.map(c => (
                      <li
                        key={`${c.campaign}|${c.source}`}
                        className="rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-[0.72rem] text-gray-700 dark:text-gray-300"
                      >
                        {c.campaign} · <span className="tabular-nums">{formatNumber(c.count)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </ReportBody>
      </div>
      <ReportNote>
        Uses the customer&apos;s answer to “How did you hear about us?” when they gave one,
        otherwise the link or site they first arrived from.
        {data && data.totals.signups > 0
          ? ` ${formatNumber(Math.round(data.trackedSignupRate))}% of new sign-ups have a source; ${formatNumber(data.answeredSignups)} answered the question.`
          : ''}{' '}
        Accounts made before tracking started show as Unknown. Counter walk-ins are not included.
      </ReportNote>
    </ReportCard>
  );
}
