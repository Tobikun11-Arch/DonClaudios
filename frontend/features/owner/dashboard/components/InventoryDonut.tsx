'use client';

import {PieChart, Pie, Cell, ResponsiveContainer} from 'recharts';
import type {CategoryStock} from '@/lib/types/dashboard';

interface Props {
  categories: CategoryStock[];
  dominant: {category: string; count: number};
  isLoading: boolean;
  isError: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  Cochinillo: '#2D4A1E',
  'Lechon de leche': '#4A7C35',
  'Lechon Belly': '#7BAF5A',
  Traditional: '#A8CC8C',
  Appetizers: '#D4A843',
  'Rice Meals': '#E8C87A',
  Pasta: '#C9B99A',
  Drinks: '#E5DDD0'
};

function getColor(category: string, index: number): string {
  return CATEGORY_COLORS[category] || `hsl(${index * 40}, 40%, 60%)`;
}

export function InventoryDonut({categories, dominant, isLoading, isError}: Props) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 px-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] w-[40%]">
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold text-[#1A1A1A]">
          Inventory by Category
        </h3>
        <p className="text-[0.8rem] text-[#6B7280]">Stock distribution</p>
      </div>

      {isLoading ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-[#6B7280]">
          Loading...
        </div>
      ) : isError ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-red-500">
          Failed to load inventory data
        </div>
      ) : categories.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-[#6B7280]">
          No inventory data
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="relative w-[130px] h-[130px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={58}
                  dataKey="count"
                  nameKey="category"
                  stroke="none"
                >
                  {categories.map((entry, idx) => (
                    <Cell key={entry.category} fill={getColor(entry.category, idx)} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[0.65rem] font-bold text-[#1A1A1A] leading-tight text-center max-w-[80px] truncate">
                {dominant.category}
              </p>
              <p className="text-[0.6rem] text-[#6B7280]">{dominant.count}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            {categories.map((entry, idx) => (
              <div key={entry.category} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{backgroundColor: getColor(entry.category, idx)}}
                />
                <span className="text-[0.75rem] text-[#1A1A1A] truncate">
                  {entry.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
