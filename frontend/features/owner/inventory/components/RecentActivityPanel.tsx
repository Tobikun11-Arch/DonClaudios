'use client';

import {Loader2, History} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ActivityRow, movementProductId} from './ActivityRow';
import type {StockMovement} from '@/lib/types/inventory';

interface Props {
  movements: StockMovement[];
  resolveName: (productId: string) => string;
  resolveUnit: (productId: string) => string;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  onOpenAll: () => void;
}

export function RecentActivityPanel({
  movements,
  resolveName,
  resolveUnit,
  isLoading,
  isError,
  onRetry,
  onOpenAll
}: Props) {
  const items = movements.slice(0, 15);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div>
        <h3 className="text-base font-bold text-gray-900">Recent activity</h3>
        <p className="text-xs text-gray-400">Latest stock movements</p>
      </div>

      <div className="mt-2">
        {isLoading && (
          <div className="space-y-3">
            {Array.from({length: 6}).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3.5 w-14 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-center">
            <p className="text-sm font-semibold text-red-800">
              Could not load activity
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
              <History className="h-5 w-5 text-gray-300" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-600">
              No activity yet
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-gray-400">
              Restocks, sales and stock changes will show up here.
            </p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="divide-y divide-gray-50">
            {items.map(m => (
              <ActivityRow
                key={m._id}
                movement={m}
                showProduct
                productName={resolveName(movementProductId(m))}
                unit={resolveUnit(movementProductId(m))}
              />
            ))}
          </div>
        )}
      </div>

      {!isLoading && !isError && movements.length > 0 && (
        <button
          type="button"
          onClick={onOpenAll}
          className="mt-3 block w-full rounded-lg py-2 text-center text-sm font-semibold text-[#2d4a35] transition-colors hover:bg-[#e9f5ee]"
        >
          View all activity
        </button>
      )}
    </div>
  );
}