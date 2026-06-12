import {TrendingUp, Wallet, Package, Users} from 'lucide-react';
import type {StatCardData} from '@/lib/types/dashboard';

const iconMap: Record<StatCardData['key'], typeof TrendingUp> = {
  todaySales: TrendingUp,
  totalRevenue: Wallet,
  productsInStock: Package,
  customers: Users
};

const iconBgMap: Record<StatCardData['key'], string> = {
  todaySales: 'bg-[#E8F0E3]',
  totalRevenue: 'bg-[#E8F0E3]',
  productsInStock: 'bg-[#E8F0E3]',
  customers: 'bg-[#E8F0E3]'
};

interface Props {
  data: StatCardData;
}

export function StatCard({data}: Props) {
  const Icon = iconMap[data.key];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center min-h-[120px]">
      <div className="flex items-start justify-between w-full">
        <div className="space-y-1.5">
          <p className="text-[0.75rem] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
            {data.label}
          </p>
          <p className="text-[1.5rem] font-bold text-[#1A1A1A] leading-none">
            {data.key === 'todaySales' || data.key === 'totalRevenue'
              ? `₱${data.value.toLocaleString()}`
              : data.value.toLocaleString()}
          </p>
          {data.delta !== undefined ? (
            <p className={`text-[0.75rem] font-medium ${
              data.delta > 0 ? 'text-[#2D7A3A]' : data.delta < 0 ? 'text-red-500' : 'text-[#6B7280]'
            }`}>
              {data.delta > 0 ? '+' : ''}{data.delta}% {data.deltaLabel}
            </p>
          ) : data.context ? (
            <p className="text-[0.75rem] text-[#6B7280]">{data.context}</p>
          ) : null}
        </div>
        <div className={`w-8 h-8 rounded-full ${iconBgMap[data.key]} flex items-center justify-center shrink-0`}>
          <Icon className="h-4 w-4 text-[#4A7C35]" />
        </div>
      </div>
    </div>
  );
}
