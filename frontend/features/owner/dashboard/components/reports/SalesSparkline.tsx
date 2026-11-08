'use client';

import {Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {formatBucketLabel, formatCompactPeso, formatPeso} from './reportPrimitives';
import type {ReportGranularity, ReportTimeseriesPoint} from '@/lib/types/report';
import {useChartColors} from '../chartTheme';

/** Compact trend line used on the overview card, where the axes would be noise. */
export function SalesSparkline({
  points,
  granularity
}: {
  points: ReportTimeseriesPoint[];
  granularity: ReportGranularity;
}) {
  const chart = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={points} margin={{top: 5, right: 10, left: -10, bottom: 0}}>
        <defs>
          <linearGradient id="reportSparkGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chart.areaFill} />
            <stop offset="100%" stopColor={chart.areaFill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="bucket" hide />
        <YAxis hide />
        <Tooltip
          labelFormatter={(bucket: string) => formatBucketLabel(bucket, granularity)}
          formatter={(value: number, name: string) => [
            formatPeso(value),
            name === 'revenue' ? 'Collected' : 'Still open'
          ]}
          contentStyle={chart.tooltip}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="revenue"
          stroke={chart.line}
          strokeWidth={2}
          fill="url(#reportSparkGradient)"
        />
        <Area
          type="monotone"
          dataKey="openRevenue"
          name="open"
          stroke="#D4A843"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          fill="none"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export {formatCompactPeso};
