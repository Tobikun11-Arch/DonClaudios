import {httpClient} from './httpClient';
import type {
  AdjustBody,
  AdjustResponse,
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
