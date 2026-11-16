import {httpClient} from './httpClient';
import type {
  AdjustBody,
  AdjustResponse,
  InventoryProductsParams,
  InventoryProductsResponse,
  ListMovementsResponse,
  RestockBody,
  RestockResponse
} from '@/lib/types/inventory';

export async function restockProduct(productId: string, body: RestockBody) {
  const res = await httpClient.patch<RestockResponse>(
    `/inventory/${productId}/restock`,
    body
  );
  return res.data;
}

export async function adjustProduct(productId: string, body: AdjustBody) {
  const res = await httpClient.patch<AdjustResponse>(
    `/inventory/${productId}/adjust`,
    body
  );
  return res.data;
}

export async function listMovements(productId?: string) {
  const params = productId ? {productId} : undefined;
  const res = await httpClient.get<ListMovementsResponse>(
    '/inventory/movements',
    {params}
  );
  return res.data;
}

/** One server-side page of the owner inventory table. */
export async function listInventoryProducts(params: InventoryProductsParams) {
  const res = await httpClient.get<InventoryProductsResponse>('/inventory/products', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search?.trim() || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      category: params.category && params.category !== 'all' ? params.category : undefined,
      sort: params.sort
    }
  });
  return res.data;
}
