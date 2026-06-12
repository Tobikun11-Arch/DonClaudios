'use client';

import {useQuery} from '@tanstack/react-query';
import {
  getDashboardSummary,
  getSalesTrend,
  getInventoryByCategory,
  getTopProducts,
  getLowStock
} from '@/lib/api/dashboardApi';

export const dashboardSummaryKey = ['dashboard', 'summary'] as const;
export const salesTrendKey = (days?: number) =>
  ['dashboard', 'sales-trend', days ?? 7] as const;
export const inventoryByCategoryKey = ['dashboard', 'inventory-by-category'] as const;
export const topProductsKey = (limit?: number) =>
  ['dashboard', 'top-products', limit ?? 5] as const;
export const lowStockKey = (threshold?: number) =>
  ['dashboard', 'low-stock', threshold ?? 10] as const;

export function useDashboardSummaryQuery(days?: number) {
  return useQuery({
    queryKey: dashboardSummaryKey,
    queryFn: () => getDashboardSummary(days),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useSalesTrendQuery(days?: number) {
  return useQuery({
    queryKey: salesTrendKey(days),
    queryFn: () => getSalesTrend(days),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useInventoryByCategoryQuery() {
  return useQuery({
    queryKey: inventoryByCategoryKey,
    queryFn: getInventoryByCategory,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useTopProductsQuery(limit?: number) {
  return useQuery({
    queryKey: topProductsKey(limit),
    queryFn: () => getTopProducts(limit),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useLowStockQuery(threshold?: number) {
  return useQuery({
    queryKey: lowStockKey(threshold),
    queryFn: () => getLowStock(threshold),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}
