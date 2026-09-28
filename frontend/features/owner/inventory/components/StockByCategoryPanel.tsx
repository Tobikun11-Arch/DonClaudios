'use client';

import {PieChart, Pie, Cell, ResponsiveContainer} from 'recharts';
import {Loader2, Activity} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

export type CategoryStockEntry = {
  category: string;
  count: number;
  unit?: string;
};

const PALETTE = [
  '#2d4a35',
  '#4a7c59',
  '#6f9d7e',
  '#93b89f',
  '#b5d1bc',
  '#d3e4d8',
  '#d4a843',
  '#e8d8a8'
];

function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

interface Props {
  data: CategoryStockEntry[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function StockByCategoryPanel({data, isLoading, isError, onRetry}: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const dominant = data[0];

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div>
        <h3 className="text-base font-bold text-gray-900">Stock by category</h3>
        <p className="text-xs text-gray-400">What is stocked, by category</p>
      </div>

      <div className="mt-4">
        {isLoading && (
          <div className="space-y-2">
            <div className="mx-auto h-40 w-40 animate-pulse rounded-full bg-gray-100" />
            {Array.from({length: 4}).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-center">
            <p className="text-sm font-semibold text-red-800">
              Could not load inventory
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-red-200 bg-white text-red-700 hover:bg-red-50"
              onClick={onRetry}
            >
              <Loader2 className="h-3.5 w-3.5" />
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
              <Activity className="h-5 w-5 text-gray-300" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-600">No stock yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Stock will be shown here once products have stock.
            </p>
          </div>
        )}

        {!isLoading && !isError && data.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="relative h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={56}
                    dataKey="count"
                    nameKey="category"
                    stroke="none"
                  >
                    {data.map((entry, idx) => (
                      <Cell key={entry.category} fill={colorFor(idx)} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1">
                <p
                  className="max-w-[72px] truncate text-center text-[11px] font-bold leading-tight text-gray-900"
                  title={dominant?.category ?? ''}
                >
                  {dominant?.category ?? ''}
                </p>
                <p className="text-[10px] text-gray-400">Most stocked</p>
              </div>
            </div>

            <div className="mt-4 w-full space-y-2">
              {data.map((entry, idx) => {
                const share = total > 0 ? Math.round((entry.count / total) * 100) : 0;
                return (
                  <div key={entry.category} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{backgroundColor: colorFor(idx)}}
                    />
                    <span
                      className="min-w-0 flex-1 truncate text-sm text-gray-700"
                      title={entry.category}
                    >
                      {entry.category}
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">
                      {entry.count}
                      {entry.unit ? (
                        <span className="ml-0.5 text-xs font-medium text-gray-400">
                          {entry.unit}
                        </span>
                      ) : (
                        ''
                      )}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 w-9 text-right text-xs font-medium tabular-nums',
                        share > 0 ? 'text-gray-400' : 'text-gray-300'
                      )}
                    >
                      {share}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}