'use client';

import {useRef, useState} from 'react';
import Image from 'next/image';
import {Loader2, Package, History, ShoppingBag} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {formatPeso} from '@/features/owner/products/utils/formatPeso';
import {getStockStatus, stockStatusConfig} from '../utils/stockStatus';
import {ActivityRow, movementProductId} from './ActivityRow';
import type {StockMovement} from '@/lib/types/inventory';

export type FastMover = {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  imageUrl?: string;
  stock?: number;
  unit?: string;
};

export type PanelView = 'fastest' | 'recent';

const VIEWS: {id: PanelView; label: string; subtitle: string}[] = [
  {id: 'fastest', label: 'Fastest movers', subtitle: 'Best sellers and what is left'},
  {id: 'recent', label: 'Recent activity', subtitle: 'Latest stock movements'}
];

function FastestMoversList({
  items,
  isLoading,
  isError,
  onRetry
}: {
  items: FastMover[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return (
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
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-center">
        <p className="text-sm font-semibold text-red-800">Could not load sales</p>
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
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
          <ShoppingBag className="h-5 w-5 text-gray-300" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-600">No sales yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Top products this month will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {items.map(item => {
        const stock = item.stock ?? 0;
        const status = getStockStatus(stock);
        const config = stockStatusConfig[status];
        const flagged = status === 'low_stock' || status === 'out_of_stock';

        return (
          <div key={item.productId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
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
              <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
              <p className="truncate text-xs text-gray-400">
                {item.unitsSold} sold · {formatPeso(item.revenue)}
              </p>
              {flagged && (
                <p className="text-[11px] font-semibold text-amber-600">
                  Selling fast, running low
                </p>
              )}
            </div>

            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums',
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
  );
}

function RecentActivityList({
  movements,
  resolveName,
  resolveUnit,
  isLoading,
  isError,
  onRetry
}: {
  movements: StockMovement[];
  resolveName: (productId: string) => string;
  resolveUnit: (productId: string) => string;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}) {
  const items = movements.slice(0, 15);

  if (isLoading) {
    return (
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
    );
  }

  if (isError) {
    return (
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
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50">
          <History className="h-5 w-5 text-gray-300" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-600">No activity yet</p>
        <p className="mt-1 text-xs text-gray-400">
          Restocks, sales and stock changes will show up here.
        </p>
      </div>
    );
  }

  return (
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
  );
}

interface Props {
  movers: FastMover[];
  movements: StockMovement[];
  moversLoading: boolean;
  moversError: boolean;
  movementsLoading: boolean;
  movementsError: boolean;
  resolveName: (productId: string) => string;
  resolveUnit: (productId: string) => string;
  onRetryMovers?: () => void;
  onRetryMovements?: () => void;
  onOpenAllActivity: () => void;
}

export function FeaturedActivityPanel({
  movers,
  movements,
  moversLoading,
  moversError,
  movementsLoading,
  movementsError,
  resolveName,
  resolveUnit,
  onRetryMovers,
  onRetryMovements,
  onOpenAllActivity
}: Props) {
  const [view, setView] = useState<PanelView>('recent');
  const touchStart = useRef<{x: number; y: number} | null>(null);

  const activeMeta = VIEWS.find(v => v.id === view) ?? VIEWS[1];

  const select = (id: PanelView) => setView(id);

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const idx = VIEWS.findIndex(v => v.id === view);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = VIEWS[(idx + dir + VIEWS.length) % VIEWS.length];
    select(next.id);
    document.getElementById(`featured-tab-${next.id}`)?.focus();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = {x: t.clientX, y: t.clientY};
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    select(dx < 0 ? 'recent' : 'fastest');
  };

  return (
    <div className="flex h-[500px] flex-col rounded-2xl border border-gray-100 bg-white p-5">
      <div
        role="tablist"
        aria-label="Fastest movers and recent activity"
        onKeyDown={handleTabKeyDown}
        className="flex h-10 w-full items-center gap-1 rounded-xl bg-gray-100 p-1"
      >
        {VIEWS.map(v => {
          const active = v.id === view;
          const count = v.id === 'fastest' ? movers.length : movements.length;
          return (
            <button
              key={v.id}
              id={`featured-tab-${v.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`featured-panel-${v.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(v.id)}
              className={cn(
                'flex h-full flex-1 items-center justify-center gap-1.5 rounded-lg text-sm transition-colors duration-200',
                active
                  ? 'bg-white font-bold text-[#2d4a35] shadow-sm'
                  : 'font-medium text-gray-500 hover:text-gray-700'
              )}
            >
              {v.label}
              <span
                className={cn(
                  'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums',
                  active ? 'bg-[#2d4a35] text-white' : 'bg-gray-200 text-gray-600'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs text-gray-400">{activeMeta.subtitle}</p>

      <div
        className="relative mt-3 min-h-0 flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            'flex h-full w-[200%] transition-transform duration-200 ease-out',
            view === 'fastest' ? 'translate-x-0' : '-translate-x-1/2'
          )}
        >
          <section
            id="featured-panel-fastest"
            role="tabpanel"
            aria-labelledby="featured-tab-fastest"
            aria-hidden={view !== 'fastest'}
            inert={view !== 'fastest'}
            className="h-full w-1/2"
          >
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto subtle-scrollbar">
                <FastestMoversList
                  items={movers}
                  isLoading={moversLoading}
                  isError={moversError}
                  onRetry={onRetryMovers}
                />
              </div>
            </div>
          </section>

          <section
            id="featured-panel-recent"
            role="tabpanel"
            aria-labelledby="featured-tab-recent"
            aria-hidden={view !== 'recent'}
            inert={view !== 'recent'}
            className="h-full w-1/2"
          >
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto subtle-scrollbar">
                <RecentActivityList
                  movements={movements}
                  resolveName={resolveName}
                  resolveUnit={resolveUnit}
                  isLoading={movementsLoading}
                  isError={movementsError}
                  onRetry={onRetryMovements}
                />
              </div>
              {!movementsLoading && !movementsError && movements.length > 0 && (
                <button
                  type="button"
                  onClick={onOpenAllActivity}
                  className="mt-2 block w-full rounded-lg py-2 text-center text-sm font-semibold text-[#2d4a35] transition-colors hover:bg-[#e9f5ee]"
                >
                  View all activity
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 pt-1">
        {VIEWS.map(v => (
          <button
            key={v.id}
            type="button"
            aria-label={`Show ${v.label}`}
            onClick={() => select(v.id)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200',
              view === v.id
                ? 'w-5 bg-[#2d4a35]'
                : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            )}
          />
        ))}
      </div>

      <span role="status" className="sr-only">
        {view === 'fastest' ? 'Showing fastest movers' : 'Showing recent activity'}
      </span>
    </div>
  );
}