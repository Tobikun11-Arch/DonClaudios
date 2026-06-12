'use client';

import {
  useDashboardSummaryQuery,
  useSalesTrendQuery,
  useInventoryByCategoryQuery,
  useTopProductsQuery,
  useLowStockQuery
} from '@/lib/hooks/dashboard/useDashboard';
import {StatCard} from './StatCard';
import {SalesTrendChart} from './SalesTrendChart';
import {InventoryDonut} from './InventoryDonut';
import {TopProductsTable} from './TopProductsTable';
import {LowStockAlert} from './LowStockAlert';

export default function DashboardPage() {
  const summaryQuery = useDashboardSummaryQuery();
  const salesTrendQuery = useSalesTrendQuery(7);
  const inventoryQuery = useInventoryByCategoryQuery();
  const topProductsQuery = useTopProductsQuery(5);
  const lowStockQuery = useLowStockQuery(10);

  const cards = summaryQuery.data?.cards ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.5rem] font-bold text-[#1A1A1A]">Dashboard</h1>
        <p className="text-[0.875rem] text-[#6B7280]">Welcome back, Owner</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <StatCard key={card.key} data={card} />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <SalesTrendChart
          data={salesTrendQuery.data?.days ?? []}
          isLoading={salesTrendQuery.isLoading}
          isError={salesTrendQuery.isError}
        />
        <InventoryDonut
          categories={inventoryQuery.data?.categories ?? []}
          dominant={inventoryQuery.data?.dominant ?? {category: '', count: 0}}
          isLoading={inventoryQuery.isLoading}
          isError={inventoryQuery.isError}
        />
      </div>

      <TopProductsTable
        products={topProductsQuery.data?.products ?? []}
        isLoading={topProductsQuery.isLoading}
        isError={topProductsQuery.isError}
      />

      <LowStockAlert
        count={lowStockQuery.data?.count ?? 0}
        items={lowStockQuery.data?.items ?? []}
        isLoading={lowStockQuery.isLoading}
        isError={lowStockQuery.isError}
      />
    </div>
  );
}
