'use client';

import {useEffect, useRef} from 'react';
import Image from 'next/image';
import {Package, X, Plus, Minus, Trash2, History} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {formatPeso} from '@/features/owner/products/utils/formatPeso';
import {stockUnitLabel} from '@/lib/categories/categoryUtils';
import {ALLERGEN_LABELS} from '@/lib/ingredients/allergens';
import {allergenIcon} from '@/lib/ingredients/allergenIcons';
import {ingredientIconByKey} from '@/lib/ingredients/ingredientIcons';
import {getStockStatus, stockStatusConfig} from '../utils/stockStatus';
import {exactDateTime} from '@/lib/utils/relativeTime';
import {MenuToggle} from './MenuToggle';
import {ActivityRow, movementProductId, movementProductName} from './ActivityRow';
import {useMovementsQuery} from '@/lib/hooks/inventory/useInventory';
import {type StockRemoveReason} from './StockChangeDialog';
import type {Product, ProductAllergen} from '@/lib/types/product';
import type {StockMovement} from '@/lib/types/inventory';

export type DrawerMode = 'product' | 'activity';

interface Props {
  open: boolean;
  mode: DrawerMode;
  product: Product | null;
  scrollTo: 'history' | null;
  activityMovements: StockMovement[];
  activityLoading: boolean;
  activityError: boolean;
  resolveName: (productId: string) => string;
  resolveUnit: (productId: string) => string;
  togglingId: string | null;
  onToggleMenu: (p: Product, next: boolean) => void;
  onRestock: (p: Product) => void;
  onRemove: (p: Product, reason?: StockRemoveReason) => void;
  onClose: () => void;
}

function creatorName(p: Product): string | null {
  const c = p.createdBy;
  if (c && typeof c === 'object' && c.firstName && c.lastName) {
    return `${c.firstName} ${c.lastName}`;
  }
  return null;
}

function AllergenChips({allergens}: {allergens?: ProductAllergen[]}) {
  const list = allergens ?? [];
  if (list.length === 0) {
    return <p className="text-sm text-gray-400">No allergens listed</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map(allergen => {
        const Icon = allergenIcon(allergen);
        return (
          <span
            key={allergen}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
          >
            <Icon className="h-3.5 w-3.5" />
            {ALLERGEN_LABELS[allergen]}
          </span>
        );
      })}
    </div>
  );
}

export function InventoryDetailDrawer({
  open,
  mode,
  product,
  scrollTo,
  activityMovements,
  activityLoading,
  activityError,
  resolveName,
  resolveUnit,
  togglingId,
  onToggleMenu,
  onRestock,
  onRemove,
  onClose
}: Props) {
  const historyRef = useRef<HTMLDivElement>(null);
  const productId = product?._id ?? '';

  const productMovementsQuery = useMovementsQuery(
    mode === 'product' ? productId : undefined
  );

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (
      open &&
      mode === 'product' &&
      scrollTo === 'history' &&
      !productMovementsQuery.isLoading &&
      historyRef.current
    ) {
      const timeout = setTimeout(() => {
        historyRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [open, mode, scrollTo, productMovementsQuery.isLoading]);

  if (!open) return null;

  const loader = (
    <div className="flex items-center justify-center py-10">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-[#2d4a35]" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className="absolute inset-0 flex justify-end">
        <div
          onClick={e => e.stopPropagation()}
          className={cn(
            'flex h-full w-full flex-col bg-white shadow-2xl border-l border-gray-100',
            'sm:w-[460px]',
            'drawer-in-right'
          )}
        >
          {mode === 'activity' ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900">
                    All activity
                  </p>
                  <p className="text-xs text-gray-500">Latest stock movements</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="ml-auto rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {activityLoading && loader}
                {activityError && (
                  <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 text-sm text-red-700">
                    Could not load activity.
                  </div>
                )}
                {!activityLoading && !activityError && activityMovements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <History className="h-6 w-6 text-gray-300" />
                    <p className="mt-3 text-sm font-semibold text-gray-600">
                      No activity yet
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Stock changes will appear here.
                    </p>
                  </div>
                )}
                {!activityLoading &&
                  !activityError &&
                  activityMovements.length > 0 && (
                    <div className="space-y-0">
                      {activityMovements.map(m => (
                        <ActivityRow
                          key={m._id}
                          movement={m}
                          showProduct
                          productName={movementProductName(
                            m,
                            resolveName(movementProductId(m))
                          )}
                          unit={resolveUnit(movementProductId(m))}
                        />
                      ))}
                    </div>
                  )}
              </div>
            </>
          ) : product ? (
            <>
              {/* Header */}
              <div className="flex items-start gap-4 border-b border-gray-100 px-5 py-4 shrink-0">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-100">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={72}
                      height={72}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-extrabold text-gray-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500">{product.category}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#2d4a35]">
                    {formatPeso(product.price)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Stock block */}
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-4xl font-extrabold tabular-nums text-gray-900">
                      {product.stock}
                      <span className="ml-1 text-base font-semibold text-gray-400">
                        {stockUnitLabel(product.stockUnit) ||
                          'units'}
                      </span>
                    </p>
                    <StatusPill stock={product.stock} />
                    <span className="ml-auto">
                      <MenuToggle
                        checked={product.isAvailable}
                        busy={togglingId === product._id}
                        warn={product.isAvailable && product.stock === 0}
                        onChange={next => onToggleMenu(product, next)}
                      />
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => onRestock(product)}
                      className="bg-[#2d4a35] text-white hover:bg-[#24402c]"
                    >
                      <Plus className="h-4 w-4" />
                      Restock
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onRemove(product)}
                      className="border-amber-200 text-amber-700 hover:bg-amber-50"
                    >
                      <Minus className="h-4 w-4" />
                      Remove stock
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => onRemove(product, 'spoilage')}
                      className="border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Record spoilage
                    </Button>
                  </div>
                </div>

                {/* About */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    About this product
                  </h4>
                  {product.description ? (
                    <p className="mt-2 text-sm text-gray-600">
                      {product.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400">
                      No description yet.
                    </p>
                  )}

                  {product.ingredients && product.ingredients.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {product.ingredients.map((ing, idx) => {
                        const Icon = ingredientIconByKey(ing.iconKey);
                        return (
                          <span
                            key={`${ing.name}-${idx}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700"
                          >
                            <Icon className="h-3.5 w-3.5 text-[#2d4a35]" />
                            {ing.name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3">
                    <AllergenChips allergens={product.allergens} />
                  </div>
                </div>

                {/* Movement history */}
                <div ref={historyRef} className="rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
                    <History className="h-4 w-4 text-gray-400" />
                    <h4 className="text-sm font-bold text-gray-900">
                      Movement history
                    </h4>
                  </div>
                  <div className="max-h-72 overflow-y-auto px-4">
                    {productMovementsQuery.isLoading && <div className="py-4">{loader}</div>}
                    {productMovementsQuery.isError && (
                      <p className="py-4 text-xs text-red-600">
                        Could not load movement history.
                      </p>
                    )}
                    {!productMovementsQuery.isLoading &&
                      !productMovementsQuery.isError &&
                      (productMovementsQuery.data?.movements ?? []).length === 0 && (
                        <div className="py-8 text-center">
                          <p className="text-sm font-semibold text-gray-600">
                            No stock movements yet
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Restock this product to get started.
                          </p>
                        </div>
                      )}
                    {(productMovementsQuery.data?.movements ?? []).length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {(productMovementsQuery.data?.movements ?? []).map(m => (
                          <ActivityRow
                            key={m._id}
                            movement={m}
                            unit={resolveUnit(movementProductId(m))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-1 text-xs text-gray-400">
                  {creatorName(product) && product.createdAt && (
                    <p>
                      Added by {creatorName(product)} on{' '}
                      {exactDateTime(product.createdAt)}
                    </p>
                  )}
                  {!creatorName(product) && product.createdAt && (
                    <p>Added on {exactDateTime(product.createdAt)}</p>
                  )}
                  <p className="mt-0.5">
                    Last updated {product.updatedAt ? exactDateTime(product.updatedAt) : '—'}
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
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