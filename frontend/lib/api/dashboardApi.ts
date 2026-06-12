import {httpClient} from './httpClient';
import type {
  DashboardSummaryResponse,
  SalesTrendResponse,
  InventoryByCategoryResponse,
  TopProductsResponse,
  LowStockResponse
} from '@/lib/types/dashboard';

export async function getDashboardSummary(days?: number) {
  const params = days ? {days} : undefined;
  const res = await httpClient.get<DashboardSummaryResponse>('/dashboard/summary', {params});
  return res.data;
}

export async function getSalesTrend(days?: number) {
  const params = days ? {days} : undefined;
  const res = await httpClient.get<SalesTrendResponse>('/dashboard/sales-trend', {params});
  return res.data;
}

export async function getInventoryByCategory() {
  const res = await httpClient.get<InventoryByCategoryResponse>('/dashboard/inventory-by-category');
  return res.data;
}

export async function getTopProducts(limit?: number) {
  const params = limit ? {limit} : undefined;
  const res = await httpClient.get<TopProductsResponse>('/dashboard/top-products', {params});
  return res.data;
}

export async function getLowStock(threshold?: number) {
  const params = threshold ? {threshold} : undefined;
  const res = await httpClient.get<LowStockResponse>('/dashboard/low-stock', {params});
  return res.data;
}
