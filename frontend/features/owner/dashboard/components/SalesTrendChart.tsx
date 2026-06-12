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

interface Props {
  data: SalesDay[];
  isLoading: boolean;
  isError: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{value: number}>;
  label?: string;
}

function CustomTooltip({active, payload, label}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] text-white text-xs rounded-lg px-3 py-2 shadow-lg">
      <p className="font-medium">{label}</p>
      <p>Sales: ₱{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

export function SalesTrendChart({data, isLoading, isError}: Props) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 px-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex-1">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[1rem] font-semibold text-[#1A1A1A]">
            Sales Trend (Last 7 Days)
          </h3>
          <p className="text-[0.8rem] text-[#6B7280]">Daily sales performance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-[#6B7280]">
          Loading...
        </div>
      ) : isError ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-red-500">
          Failed to load sales data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{top: 5, right: 5, left: -20, bottom: 0}}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E8F0E3" />
                <stop offset="100%" stopColor="#E8F0E3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
            <XAxis
              dataKey="date"
              tick={{fontSize: 11, fill: '#6B7280'}}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: string) => {
                const d = new Date(val + 'T00:00:00');
                return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
              }}
            />
            <YAxis
              tick={{fontSize: 11, fill: '#6B7280'}}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: number) => `₱${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#4A7C35"
              strokeWidth={2}
              fill="url(#salesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
