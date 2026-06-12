import {AlertTriangle} from 'lucide-react';
import type {LowStockItem} from '@/lib/types/dashboard';

interface Props {
  count: number;
  items: LowStockItem[];
  isLoading: boolean;
  isError: boolean;
}

export function LowStockAlert({count, items, isLoading, isError}: Props) {
  if (isLoading) {
    return (
      <div className="bg-[#FEF7EC] border-l-4 border-[#D4860A] rounded-xl p-3.5 px-[18px] flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-[#D4860A] shrink-0" />
        <span className="text-sm text-[#6B7280]">Checking stock levels...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-3.5 px-[18px] flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
        <span className="text-sm text-red-600">Failed to check stock alerts</span>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-[#FEF7EC] border-l-4 border-[#D4860A] rounded-xl p-3.5 px-[18px]">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[#D4860A] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-[#1A1A1A]">Low Stock Alert</p>
          <p className="text-[0.875rem] text-[#6B7280]">
            {count} {count === 1 ? 'item is' : 'items are'} running low on stock. Restock soon to avoid shortages.
          </p>
          <p className="text-[0.875rem] font-semibold text-[#D4860A] mt-1">
            {items.map((item, idx) => (
              <span key={item.productId}>
                {item.name}
                {idx < items.length - 1 && <span className="mx-1.5">•</span>}
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
