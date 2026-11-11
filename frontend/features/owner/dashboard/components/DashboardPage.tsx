'use client';

import {Suspense, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {BarChart3, LayoutGrid} from 'lucide-react';
import {
  useDashboardSummaryQuery,
  useInventoryByCategoryQuery,
  useLowStockQuery,
  useSalesTrendQuery,
  useTopProductsQuery
} from '@/lib/hooks/dashboard/useDashboard';
import {StatCard} from './StatCard';
import {SalesTrendChart} from './SalesTrendChart';
import {InventoryDonut} from './InventoryDonut';
import {TopProductsTable} from './TopProductsTable';
import {LowStockAlert} from './LowStockAlert';
import {StuckOrdersAlert} from './StuckOrdersAlert';
import {
  DEFAULT_REPORT_RANGE,
  isValidView,
  ReportsWorkspace
} from './reports/ReportsWorkspace';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {cn} from '@/lib/utils';
import type {ReportRange, ReportView} from '@/lib/types/report';

type Mode = 'overview' | 'reports';

function DashboardPageContent() {
  // `?view=` is what every "Details →" link in the reports points at, so read it
  // on mount to land on the requested sub-tab instead of the default.
  const searchParams = useSearchParams();
  const requestedView = searchParams.get('view');
  const [mode, setMode] = useState<Mode>(requestedView ? 'reports' : 'overview');
  const [view, setView] = useState<ReportView>(
    requestedView && isValidView(requestedView) ? requestedView : 'overview'
  );
  const [range, setRange] = useState<ReportRange>(DEFAULT_REPORT_RANGE);
  const meQuery = useMeQuery()
  const user = meQuery.data?.user;

  const summaryQuery = useDashboardSummaryQuery();
  const salesTrendQuery = useSalesTrendQuery(7);
  const inventoryQuery = useInventoryByCategoryQuery();
  const topProductsQuery = useTopProductsQuery(5);
  const lowStockQuery = useLowStockQuery(10);

  const cards = summaryQuery.data?.cards ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-[#2d4a35] dark:text-[#7ed4a0]">Dashboard</h1>
          <p className="text-[0.875rem] text-[#6B7280] dark:text-gray-400">Welcome back, {user?.firstName}</p>
        </div>
        <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
          <div className="grid w-full grid-cols-2 gap-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0.5 sm:flex sm:w-auto">
            {(
              [
                {key: 'overview', label: 'Home', icon: LayoutGrid},
                {key: 'reports', label: 'Reports', icon: BarChart3}
              ] as const
            ).map(item => {
              const Icon = item.icon;
              const active = mode === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors',
                    active
                      ? 'bg-[#2d4a35] text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
        <OwnerNotificationBell />
      </div>

      {mode === 'reports' ? (
        <ReportsWorkspace
          view={view}
          range={range}
          onViewChange={setView}
          onRangeChange={setRange}
        />
      ) : (
        <>
          <StuckOrdersAlert
            split={summaryQuery.data?.valueSplit}
            isLoading={summaryQuery.isLoading}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(card => (
              <StatCard key={card.key} data={card} />
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row">
            <SalesTrendChart
              data={salesTrendQuery.data?.days ?? []}
              isLoading={salesTrendQuery.isLoading}
              isError={salesTrendQuery.isError}
            />
            <InventoryDonut
              categories={inventoryQuery.data?.categories ?? []}
              dominant={
                inventoryQuery.data?.dominant ?? {category: '', count: 0}
              }
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
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageContent />
    </Suspense>
  );
}

export {isValidView};
