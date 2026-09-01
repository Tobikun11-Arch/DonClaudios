'use client';

import {useRestockMutation, useAdjustMutation} from '@/lib/hooks/inventory/useInventory';
import {useProductsQuery} from '@/lib/hooks/products/useProducts';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {getStockStatus} from '../utils/stockStatus';
import {useInventory} from '../hooks/useInventory';
import {InventoryStats} from './InventoryStats';
import {InventoryTable} from './InventoryTable';
import {RestockModal} from './RestockModal';
import {AdjustModal} from './AdjustModal';
import {MovementHistoryModal} from './MovementHistoryModal';
import {useMemo, useState} from 'react';
import type {Product} from '@/lib/types/product';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';

export default function InventoryPage() {
  const productsQuery = useProductsQuery();
  const restockMutation = useRestockMutation();
  const adjustMutation = useAdjustMutation();

  const {search, setSearch, statusFilter, setStatusFilter} = useInventory();

  const [restockTarget, setRestockTarget] = useState<Product | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Product | null>(null);

  const products = useMemo(
    () => productsQuery.data?.products ?? [],
    [productsQuery.data?.products]
  );

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (statusFilter !== 'all' && getStockStatus(p.stock) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, search, statusFilter]);

  const stats = useMemo(() => {
    const lowStock = products.filter(
      p => getStockStatus(p.stock) === 'low_stock'
    ).length;
    const outOfStock = products.filter(
      p => getStockStatus(p.stock) === 'out_of_stock'
    ).length;
    return {total: products.length, lowStock, outOfStock};
  }, [products]);

  const handleRestock = async (quantity: number, note?: string) => {
    if (!restockTarget) return;
    await restockMutation.mutateAsync({
      productId: restockTarget._id,
      quantity,
      note
    });
    setRestockTarget(null);
  };

  const handleAdjust = async (
    quantity: number,
    reason: 'spoilage' | 'adjustment',
    note?: string
  ) => {
    if (!adjustTarget) return;
    await adjustMutation.mutateAsync({
      productId: adjustTarget._id,
      quantity,
      reason,
      note
    });
    setAdjustTarget(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">
            Inventory Management
          </h1>
          <p className="text-sm text-gray-500">
            Track stock levels, restock products, and view movement history.
          </p>
        </div>
        <OwnerNotificationBell />
      </div>

      <InventoryStats
        total={stats.total}
        lowStock={stats.lowStock}
        outOfStock={stats.outOfStock}
      />

      <InventoryTable
        products={visibleProducts}
        isLoading={productsQuery.isLoading}
        isError={productsQuery.isError}
        search={search}
        statusFilter={statusFilter}
        onSearchChange={setSearch}
        onStatusFilterChange={setStatusFilter}
        onRestock={setRestockTarget}
        onAdjust={setAdjustTarget}
        onHistory={setHistoryTarget}
        errorMessage={getFriendlyErrorMessage(
          productsQuery.error,
          'Failed to load products'
        )}
      />

      <RestockModal
        open={!!restockTarget}
        productName={restockTarget?.name ?? ''}
        currentStock={restockTarget?.stock ?? 0}
        isPending={restockMutation.isPending}
        onConfirm={handleRestock}
        onClose={() => !restockMutation.isPending && setRestockTarget(null)}
      />

      <AdjustModal
        open={!!adjustTarget}
        productName={adjustTarget?.name ?? ''}
        currentStock={adjustTarget?.stock ?? 0}
        isPending={adjustMutation.isPending}
        onConfirm={handleAdjust}
        onClose={() => !adjustMutation.isPending && setAdjustTarget(null)}
      />

      <MovementHistoryModal
        open={!!historyTarget}
        productId={historyTarget?._id ?? ''}
        productName={historyTarget?.name ?? ''}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
