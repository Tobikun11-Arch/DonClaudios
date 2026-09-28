'use client';

import {useRouter} from 'next/navigation';
import Image from 'next/image';
import {
  Package,
  Plus,
  Minus,
  History,
  Loader2,
  SearchX
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {getStockStatus, stockStatusConfig, type StockStatus} from '../utils/stockStatus';
import {stockUnitLabel} from '@/lib/categories/categoryUtils';
import {ALLERGEN_LABELS} from '@/lib/ingredients/allergens';
import {allergenIcon} from '@/lib/ingredients/allergenIcons';
import {relativeTime, exactDateTime} from '@/lib/utils/relativeTime';
import {InventoryToolbar, type SortOption} from './InventoryToolbar';
import {MenuToggle} from './MenuToggle';
import type {Product, ProductAllergen} from '@/lib/types/product';

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  counts: Record<'all' | StockStatus, number>;
  statusFilter: 'all' | StockStatus;
  onStatusFilterChange: (v: 'all' | StockStatus) => void;
  categories: string[];
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
}

interface Props {
  products: Product[];
  hasAnyProducts: boolean;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  toolbar: ToolbarProps;
  togglingId: string | null;
  onToggleMenu: (p: Product, next: boolean) => void;
  onOpenRow: (p: Product) => void;
  onRestock: (p: Product) => void;
  onRemove: (p: Product) => void;
  onHistory: (p: Product) => void;
}

function StockValue({stock, hasSpace = false}: {stock: number; hasSpace?: boolean}) {
  const tone =
    stock === 0 ? 'text-red-600' : stock <= 10 ? 'text-amber-600' : 'text-gray-900';
  return (
    <span className={cn('font-extrabold tabular-nums', tone, hasSpace && 'ml-auto')}>
      {stock}
    </span>
  );
}

function StatusPill({stock}: {stock: number}) {
  const status = getStockStatus(stock);
  const config = stockStatusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold',
        config.bg,
        config.text
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

function AllergenMinis({allergens}: {allergens?: ProductAllergen[]}) {
  const list = allergens ?? [];
  if (list.length === 0) {
    return <span className="text-lg font-light text-gray-300">–</span>;
  }
  const shown = list.slice(0, 3);
  const extra = list.length - shown.length;
  return (
    <div className="flex items-center justify-center gap-1">
      {shown.map(allergen => {
        const Icon = allergenIcon(allergen);
        return (
          <span
            key={allergen}
            title={ALLERGEN_LABELS[allergen]}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-700"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
      {extra > 0 && (
        <span
          title={`${extra} more allergen${extra > 1 ? 's' : ''}`}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-500"
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

function ActionButtons({
  onRestock,
  onRemove,
  onHistory,
  className
}: {
  onRestock: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
  onHistory: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const base = 'h-9 w-9 p-0';
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(base, 'text-green-600 hover:bg-green-50 hover:text-green-700')}
        title="Restock"
        onClick={onRestock}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(base, 'text-amber-600 hover:bg-amber-50 hover:text-amber-700')}
        title="Remove stock"
        onClick={onRemove}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(base, 'text-blue-600 hover:bg-blue-50 hover:text-blue-700')}
        title="View history"
        onClick={onHistory}
      >
        <History className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProductThumb({product, size = 44}: {product: Product; size?: number}) {
  return (
    <div
      className="shrink-0 overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center"
      style={{width: size, height: size}}
    >
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <Package className="text-gray-300" style={{width: size / 2.4, height: size / 2.4}} />
      )}
    </div>
  );
}

export function InventoryTable({
  products,
  hasAnyProducts,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  toolbar,
  togglingId,
  onToggleMenu,
  onOpenRow,
  onRestock,
  onRemove,
  onHistory
}: Props) {
  const router = useRouter();

  const noProductsAtAll = hasAnyProducts === false;
  const noResults = !noProductsAtAll && !isLoading && !isError && products.length === 0;

  return (
    <div className="space-y-4">
      <InventoryToolbar {...toolbar} />

      {isLoading && (
        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          <div className="divide-y divide-gray-50">
            {Array.from({length: 5}).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-4">
                <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/5 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-1/5 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-3.5 w-12 animate-pulse rounded bg-gray-100" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6">
          <p className="text-sm font-semibold text-red-800">Could not load inventory</p>
          <p className="mt-1 text-xs text-red-700/80">
            {errorMessage ?? 'Please try again.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-3 border-red-200 bg-white text-red-700 hover:bg-red-50"
          >
            <Loader2 className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      )}

      {noProductsAtAll && !isLoading && !isError && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <Package className="h-6 w-6 text-gray-300" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No products in inventory yet
          </h3>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            Add your products first, then manage their stock here.
          </p>
          <Button
            className="mt-5 bg-[#2d4a35] text-white hover:bg-[#24402c]"
            onClick={() => router.push('/owner/dashboard?tab=products')}
          >
            Go to Products
          </Button>
        </div>
      )}

      {noResults && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
            <SearchX className="h-6 w-6 text-gray-300" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            No products match your search
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              toolbar.onSearchChange('');
              toolbar.onStatusFilterChange('all');
              toolbar.onCategoryChange('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {!isLoading && !isError && products.length > 0 && (
        <>
          {/* Desktop / tablet table */}
          <div className="hidden md:block rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                      Product
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500 hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                      On menu
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                      Allergens
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                      Last updated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr
                      key={p._id}
                      onClick={() => onOpenRow(p)}
                      className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <ProductThumb product={p} size={44} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-gray-900">
                              {p.name}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              {p.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-extrabold tabular-nums">
                          <StockValue stock={p.stock} />
                        </span>
                        {stockUnitLabel(p.stockUnit) && (
                          <span className="ml-1 text-xs font-medium text-gray-400">
                            {stockUnitLabel(p.stockUnit)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <StatusPill stock={p.stock} />
                      </td>
                      <td
                        className="px-4 py-3 text-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <MenuToggle
                          checked={p.isAvailable}
                          busy={togglingId === p._id}
                          warn={p.isAvailable && p.stock === 0}
                          onChange={next => onToggleMenu(p, next)}
                        />
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <AllergenMinis allergens={p.allergens} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className="text-xs text-gray-400"
                          title={exactDateTime(p.updatedAt)}
                        >
                          {relativeTime(p.updatedAt)}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={e => e.stopPropagation()}
                      >
                        <ActionButtons
                          onRestock={e => {
                            e.stopPropagation();
                            onRestock(p);
                          }}
                          onRemove={e => {
                            e.stopPropagation();
                            onRemove(p);
                          }}
                          onHistory={e => {
                            e.stopPropagation();
                            onHistory(p);
                          }}
                          className="justify-end"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card list */}
          <div className="space-y-3 md:hidden">
            {products.map(p => {
              const status = getStockStatus(p.stock);
              const config = stockStatusConfig[status];
              return (
                <div
                  key={p._id}
                  onClick={() => onOpenRow(p)}
                  className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 transition-colors hover:bg-gray-50/60"
                >
                  <div className="flex items-start gap-3">
                    <ProductThumb product={p} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {p.category}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <p className="text-sm font-extrabold tabular-nums">
                          <StockValue stock={p.stock} />
                        </p>
                        {stockUnitLabel(p.stockUnit) && (
                          <span className="text-xs font-medium text-gray-400">
                            {stockUnitLabel(p.stockUnit)}
                          </span>
                        )}
                        <span
                          className={cn(
                            'ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                            config.bg,
                            config.text
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              config.dot
                            )}
                          />
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3">
                    <MenuToggle
                      checked={p.isAvailable}
                      busy={togglingId === p._id}
                      warn={p.isAvailable && p.stock === 0}
                      onChange={next => onToggleMenu(p, next)}
                    />
                    <ActionButtons
                      onRestock={e => {
                        e.stopPropagation();
                        onRestock(p);
                      }}
                      onRemove={e => {
                        e.stopPropagation();
                        onRemove(p);
                      }}
                      onHistory={e => {
                        e.stopPropagation();
                        onHistory(p);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-gray-400">
            Showing {products.length} of {toolbar.counts.all} products
          </p>
        </>
      )}
    </div>
  );
}