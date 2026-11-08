'use client';

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import type {SalesDay} from '@/lib/types/dashboard';
import {useChartColors} from './chartTheme';

interface Props {
  data: SalesDay[];
  isLoading: boolean;
  isError: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{value: number; name?: string; dataKey?: string}>;
  label?: string;
}

function CustomTooltip({active, payload, label}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-medium">{label}</p>
      {payload.map(entry => (
        <p key={entry.dataKey}>
          {entry.dataKey === 'openRevenue' ? 'Still open' : 'Collected'}: ₱
          {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function SalesTrendChart({data, isLoading, isError}: Props) {
  const chart = useChartColors();
  return (
    <div className="bg-white dark:bg-gray-900 border border-[#E5E7EB] dark:border-gray-700 rounded-xl p-4 px-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[1rem] font-semibold text-[#1A1A1A] dark:text-gray-100">
            Sales Trend (Last 7 Days)
          </h3>
          <p className="text-[0.8rem] text-[#6B7280] dark:text-gray-400">
            Collected revenue, with still-open orders dashed
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-[#6B7280] dark:text-gray-400">
          Loading...
        </div>
      ) : isError ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-red-500">
          Failed to load sales data
        </div>
      ) : data.length === 0 ? (
        // Without this the card rendered an empty 200px chart frame instead of
        // saying why, which is what `InventoryDonut` already did.
        <div className="h-[200px] flex items-center justify-center text-sm text-[#6B7280] dark:text-gray-400">
          No sales in this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.areaFill} />
                <stop offset="100%" stopColor={chart.areaFill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} horizontal={true} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{fontSize: 11, fill: chart.tick}}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: string) => {
                const d = new Date(val + 'T00:00:00');
                return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
              }}
            />
            <YAxis
              tick={{fontSize: 11, fill: chart.tick}}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: number) => `₱${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={chart.line}
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
            <Area
              type="monotone"
              dataKey="openRevenue"
              stroke="#D4A843"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
