'use client';

import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import {useProductsQuery, useUpdateProductMutation} from '@/lib/hooks/products/useProducts';
import {
  useMovementsQuery,
  useRestockMutation,
  useAdjustMutation
} from '@/lib/hooks/inventory/useInventory';
import {useTopProductsQuery} from '@/lib/hooks/dashboard/useDashboard';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {stockUnitLabel} from '@/lib/categories/categoryUtils';
import {getStockStatus, type StockStatus} from '../utils/stockStatus';
import {InventorySummaryCards} from './InventorySummaryCards';
import {AttentionBanner, type AttentionItem} from './AttentionBanner';
import {InventoryTable} from './InventoryTable';
import {
  StockChangeDialog,
  type StockActionMode,
  type StockRemoveReason
} from './StockChangeDialog';
import {InventoryDetailDrawer, type DrawerMode} from './InventoryDetailDrawer';
import {
  StockByCategoryPanel,
  type CategoryStockEntry
} from './StockByCategoryPanel';
import {FeaturedActivityPanel, type FastMover} from './FeaturedActivityPanel';
import {type SortOption} from './InventoryToolbar';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import type {Product} from '@/lib/types/product';

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({length: 4}).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4"
        >
          <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
            <div className="h-6 w-10 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const productsQuery = useProductsQuery();
  const topProductsQuery = useTopProductsQuery(5);
  const movementsQuery = useMovementsQuery();
  const restockMutation = useRestockMutation();
  const adjustMutation = useAdjustMutation();
  const updateProductMutation = useUpdateProductMutation();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StockStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<SortOption>('attention');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dialogNonce, setDialogNonce] = useState(0);
  const [dialog, setDialog] = useState<{
    product: Product;
    mode: StockActionMode;
    reason: StockRemoveReason;
  } | null>(null);
  const [drawer, setDrawer] = useState<{
    product: Product | null;
    mode: DrawerMode;
    scrollTo: 'history' | null;
  } | null>(null);

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const counts = useMemo(() => {
    const c = {
      all: products.length,
      in_stock: 0,
      low_stock: 0,
      out_of_stock: 0
    };
    for (const p of products) {
      c[getStockStatus(p.stock)] += 1;
    }
    return c;
  }, [products]);

  const onMenuCount = useMemo(
    () => products.filter(p => p.isAvailable).length,
    [products]
  );

  const categories = useMemo(
    () => Array.from(new Set(products.map(p => p.category))).sort(),
    [products]
  );

  const unitById = useMemo(
    () => new Map(products.map(p => [p._id, stockUnitLabel(p.stockUnit)])),
    [products]
  );
  const nameById = useMemo(
    () => new Map(products.map(p => [p._id, p.name])),
    [products]
  );
  const resolveUnit = (productId: string) => unitById.get(productId) ?? '';
  const resolveName = (productId: string) => nameById.get(productId) ?? 'Product';

  const stockByCategory = useMemo<CategoryStockEntry[]>(() => {
    const map = new Map<string, CategoryStockEntry>();
    for (const p of products) {
      const current =
        map.get(p.category) ??
        ({category: p.category, count: 0, unit: stockUnitLabel(p.stockUnit)} satisfies CategoryStockEntry);
      current.count += p.stock;
      map.set(p.category, current);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const fastMovers = useMemo<FastMover[]>(() => {
    const byId = new Map(products.map(p => [p._id, p]));
    return (topProductsQuery.data?.products ?? []).map(tp => {
      const product = byId.get(tp.productId);
      return {
        productId: tp.productId,
        name: tp.name,
        unitsSold: tp.unitsSold,
        revenue: tp.revenue,
        imageUrl: product?.imageUrl,
        stock: product?.stock,
        unit: product ? stockUnitLabel(product.stockUnit) : undefined
      };
    });
  }, [products, topProductsQuery.data?.products]);

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter(p => {
      if (statusFilter !== 'all' && getStockStatus(p.stock) !== statusFilter) {
        return false;
      }
      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }
      if (q && !p.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    const priorityOf = (stock: number) => (stock === 0 ? 0 : stock <= 10 ? 1 : 2);

    const sorted = filtered.slice();
    switch (sort) {
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'stock_asc':
        sorted.sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name));
        break;
      case 'stock_desc':
        sorted.sort((a, b) => b.stock - a.stock || a.name.localeCompare(b.name));
        break;
      case 'updated':
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt ?? 0).getTime() -
            new Date(a.updatedAt ?? 0).getTime()
        );
        break;
      case 'attention':
      default:
        sorted.sort(
          (a, b) =>
            priorityOf(a.stock) - priorityOf(b.stock) ||
            a.name.localeCompare(b.name)
        );
        break;
    }
    return sorted;
  }, [products, search, statusFilter, categoryFilter, sort]);

  const toastError = (error: unknown, fallback: string) =>
    toast.error(getFriendlyErrorMessage(error, fallback));

  const handleRestock = async (
    quantity: number,
    _reason: StockRemoveReason | null,
    note?: string
  ) => {
    if (!dialog?.product) return;
    const {product} = dialog;
    const newStock = product.stock + quantity;
    setDialog(null);
    const unitSuffix = stockUnitLabel(product.stockUnit);
    try {
      await restockMutation.mutateAsync({
        productId: product._id,
        quantity,
        note
      });
      toast.success(
        `Restocked ${product.name}: ${product.stock} → ${newStock}${unitSuffix ? ` ${unitSuffix}` : ''}`,
        {position: 'bottom-center'}
      );
    } catch (error) {
      toastError(error, 'Failed to restock.');
    }
  };

  const handleRemove = async (
    quantity: number,
    reason: StockRemoveReason | null,
    note?: string
  ) => {
    if (!dialog?.product) return;
    const {product} = dialog;
    const safeReason = reason ?? 'adjustment';
    const newStock = product.stock - quantity;
    setDialog(null);
    const unitSuffix = stockUnitLabel(product.stockUnit);
    const verb = safeReason === 'spoilage' ? 'Recorded spoilage' : 'Removed stock';
    try {
      await adjustMutation.mutateAsync({
        productId: product._id,
        quantity: -quantity,
        reason: safeReason,
        note
      });
      toast.success(
        `${verb} for ${product.name}: ${product.stock} → ${newStock}${unitSuffix ? ` ${unitSuffix}` : ''}`,
        {position: 'bottom-center'}
      );
    } catch (error) {
      toastError(error, 'Failed to update stock.');
    }
  };

  const openRemoveDialog = (product: Product, reason: StockRemoveReason = 'adjustment') => {
    setDrawer(null);
    setDialogNonce(n => n + 1);
    setDialog({product, mode: 'remove', reason});
  };

  const openRestockDialog = (product: Product) => {
    setDrawer(null);
    setDialogNonce(n => n + 1);
    setDialog({product, mode: 'restock', reason: 'adjustment'});
  };

  const handleToggleMenu = async (product: Product, next: boolean) => {
    setTogglingId(product._id);
    try {
      await updateProductMutation.mutateAsync({
        id: product._id,
        body: {isAvailable: next}
      });
      toast.success(
        next
          ? `${product.name} is now on the menu.`
          : `${product.name} removed from menu.`,
        {position: 'bottom-center'}
      );
    } catch (error) {
      toastError(error, 'Failed to update menu status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTurnOffSellableOut = async (targets: Product[]) => {
    for (const product of targets) {
      try {
        await updateProductMutation.mutateAsync({
          id: product._id,
          body: {isAvailable: false}
        });
      } catch (error) {
        toastError(error, `Failed to update ${product.name}.`);
      }
    }
    toast.success(
      `${targets.length} product${targets.length > 1 ? 's' : ''} removed from menu.`,
      {position: 'bottom-center'}
    );
  };

  const applyAttentionFilter = (status: 'low_stock' | 'out_of_stock') => {
    setStatusFilter(status);
    setCategoryFilter('all');
    setSearch('');
  };

  const sellableOut = products.filter(p => p.isAvailable && p.stock === 0);

  const plural = (n: number) => (n === 1 ? '' : 's');
  const isAre = (n: number) => (n === 1 ? 'is' : 'are');

  const attentionItems: AttentionItem[] = [];
  if (sellableOut.length > 0) {
    attentionItems.push({
      key: 'sellableOut',
      text: `${sellableOut.length} product${plural(sellableOut.length)} ${isAre(sellableOut.length)} on the menu but out of stock.`,
      actionLabel: 'Turn off on menu',
      onAction: () => handleTurnOffSellableOut(sellableOut)
    });
  }
  const offMenuOut = products.filter(p => !p.isAvailable && p.stock === 0);
  if (offMenuOut.length > 0) {
    attentionItems.push({
      key: 'out',
      text: `${offMenuOut.length} product${plural(offMenuOut.length)} ${isAre(offMenuOut.length)} out of stock.`,
      actionLabel: 'Review',
      onAction: () => applyAttentionFilter('out_of_stock')
    });
  }
  const runningLow = products.filter(p => p.stock > 0 && p.stock <= 10);
  if (runningLow.length > 0) {
    attentionItems.push({
      key: 'low',
      text: `${runningLow.length} product${plural(runningLow.length)} ${isAre(runningLow.length)} running low.`,
      actionLabel: 'Review',
      onAction: () => applyAttentionFilter('low_stock')
    });
  }

  const isLoadingFirst = productsQuery.isLoading && !productsQuery.data;

  return (
    <div className="space-y-5 pb-24 md:pb-28">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-extrabold text-[#2d4a35]">
            Inventory Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Track stock levels, restock products, and view movement history.
          </p>
        </div>
        <OwnerNotificationBell alert={counts.low_stock + counts.out_of_stock > 0} />
      </div>

      {isLoadingFirst ? (
        <SummarySkeleton />
      ) : (
        <InventorySummaryCards
          total={products.length}
          lowStock={counts.low_stock}
          outOfStock={counts.out_of_stock}
          onMenu={onMenuCount}
        />
      )}

      <AttentionBanner items={attentionItems} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start min-w-0">
        <section className="min-w-0">
          <InventoryTable
            products={visibleProducts}
            hasAnyProducts={products.length > 0}
            isLoading={productsQuery.isLoading}
            isError={productsQuery.isError}
            errorMessage={getFriendlyErrorMessage(
              productsQuery.error,
              'Failed to load products'
            )}
            onRetry={() => productsQuery.refetch()}
            toolbar={{
              search,
              onSearchChange: setSearch,
              counts,
              statusFilter,
              onStatusFilterChange: setStatusFilter,
              categories,
              categoryFilter,
              onCategoryChange: setCategoryFilter,
              sort,
              onSortChange: setSort
            }}
            togglingId={togglingId}
            onToggleMenu={handleToggleMenu}
            onOpenRow={p => setDrawer({product: p, mode: 'product', scrollTo: null})}
            onRestock={openRestockDialog}
            onRemove={p => openRemoveDialog(p)}
            onHistory={p =>
              setDrawer({product: p, mode: 'product', scrollTo: 'history'})
            }
          />
        </section>

        <div className="min-w-0 space-y-6">
          <StockByCategoryPanel
            data={stockByCategory}
            isLoading={productsQuery.isLoading}
            isError={productsQuery.isError}
            onRetry={() => productsQuery.refetch()}
          />
          <FeaturedActivityPanel
            movers={fastMovers}
            movements={movementsQuery.data?.movements ?? []}
            moversLoading={topProductsQuery.isLoading}
            moversError={topProductsQuery.isError}
            movementsLoading={movementsQuery.isLoading}
            movementsError={movementsQuery.isError}
            resolveName={resolveName}
            resolveUnit={resolveUnit}
            onRetryMovers={() => topProductsQuery.refetch()}
            onRetryMovements={() => movementsQuery.refetch()}
            onOpenAllActivity={() =>
              setDrawer({product: null, mode: 'activity', scrollTo: null})
            }
          />
        </div>
      </div>

      <StockChangeDialog
        key={`dialog-${dialogNonce}`}
        open={!!dialog}
        product={dialog?.product ?? null}
        mode={dialog?.mode ?? 'restock'}
        initialReason={dialog?.reason ?? 'adjustment'}
        isPending={restockMutation.isPending || adjustMutation.isPending}
        onConfirm={
          dialog?.mode === 'remove' ? handleRemove : handleRestock
        }
        onClose={() => setDialog(null)}
      />

      <InventoryDetailDrawer
        open={!!drawer}
        mode={drawer?.mode ?? 'product'}
        product={drawer?.product ?? null}
        scrollTo={drawer?.scrollTo ?? null}
        activityMovements={movementsQuery.data?.movements ?? []}
        activityLoading={movementsQuery.isLoading}
        activityError={movementsQuery.isError}
        resolveName={resolveName}
        resolveUnit={resolveUnit}
        togglingId={togglingId}
        onToggleMenu={handleToggleMenu}
        onRestock={openRestockDialog}
        onRemove={openRemoveDialog}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}