'use client';

import {Package, Loader2, ShoppingBag} from 'lucide-react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {formatPeso} from '@/features/owner/products/utils/formatPeso';
import {getStockStatus, stockStatusConfig} from '../utils/stockStatus';

export type FastMover = {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  imageUrl?: string;
  stock?: number;
  unit?: string;
};

interface Props {
  items: FastMover[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function FastestMoversPanel({items, isLoading, isError, onRetry}: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div>
        <h3 className="text-base font-bold text-gray-900">Fastest movers</h3>
        <p className="text-xs text-gray-400">Best sellers and what is left</p>
      </div>

      <div className="mt-4">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({length: 5}).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-center">
            <p className="text-sm font-semibold text-red-800">
              Could not load sales
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

        {!isLoading && !isError && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
              <ShoppingBag className="h-5 w-5 text-gray-300" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-600">No sales yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Top products this month will appear here.
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="divide-y divide-gray-50">
            {items.map(item => {
              const stock = item.stock ?? 0;
              const status = getStockStatus(stock);
              const config = stockStatusConfig[status];
              const flagged = status === 'low_stock' || status === 'out_of_stock';

              return (
                <div
                  key={item.productId}
                  className={cn(
                    'flex items-center gap-3 py-3 first:pt-0 last:pb-0',
                    flagged && 'rounded-lg bg-red-50/30 px-2 -mx-2'
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-4 w-4 text-gray-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.unitsSold} sold · {formatPeso(item.revenue)}
                    </p>
                    {flagged && (
                      <p className="text-[11px] font-semibold text-red-500">
                        Selling fast, running low
                      </p>
                    )}
                  </div>

                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold',
                      config.bg,
                      config.text
                    )}
                  >
                    {stock}
                    {item.unit ? ` ${item.unit}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}