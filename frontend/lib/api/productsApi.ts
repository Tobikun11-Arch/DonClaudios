import {httpClient} from './httpClient';
import type {
  CreateProductBody,
  CreateProductResponse,
  DeleteProductResponse,
  ListProductsResponse,
  UpdateProductBody,
  UpdateProductResponse
} from '@/lib/types/product';

export async function listProducts() {
  const res = await httpClient.get<ListProductsResponse>('/products');
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
