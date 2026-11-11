import {httpClient} from './httpClient';
import type {
  CreateProductBody,
  CreateProductResponse,
  DeleteProductResponse,
  GetProductResponse,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductResponse
} from '@/lib/types/product';

export async function listProducts() {
  const res = await httpClient.get<ListProductsResponse>('/products');
  return res.data;
}

/** Ids of the most-sold products (completed orders, last 30 days). */
export async function listBestSellerIds(limit = 6) {
  const res = await httpClient.get<{productIds: string[]}>('/products/best-sellers', {
    params: {limit}
  });
  return res.data.productIds;
}

export async function getProduct(id: string) {
  const res = await httpClient.get<GetProductResponse>(`/products/${id}`);
  return res.data;
}

export async function createProduct(body: CreateProductBody) {
  const res = await httpClient.post<CreateProductResponse>('/products', body);
  return res.data;
}

export async function updateProduct(params: {
  id: string;
  body: UpdateProductBody;
}) {
  const res = await httpClient.patch<UpdateProductResponse>(
    `/products/${params.id}`,
    params.body
  );
  return res.data;
}

export async function deleteProduct(id: string) {
  const res = await httpClient.delete<DeleteProductResponse>(`/products/${id}`);
  return res.data;
}
