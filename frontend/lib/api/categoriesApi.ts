import {httpClient} from './httpClient';
import type {
  Category,
  CreateCategoryBody,
  CreateCategoryResponse,
  DeleteCategoryResponse,
  ListCategoriesResponse,
  UpdateCategoryBody,
  UpdateCategoryResponse
} from '@/lib/types/category';

export async function listCategories() {
  const res = await httpClient.get<ListCategoriesResponse>('/categories');
  return res.data;
}

export async function listPublicCategories() {
  const res = await httpClient.get<ListCategoriesResponse>('/categories/public');
  return res.data;
}

export async function createCategory(body: CreateCategoryBody) {
  const res = await httpClient.post<CreateCategoryResponse>('/categories', body);
  return res.data;
}

export async function updateCategory(params: {
  id: string;
  body: UpdateCategoryBody;
}) {
  const res = await httpClient.patch<UpdateCategoryResponse>(
    `/categories/${params.id}`,
    params.body
  );
  return res.data;
}

export async function deleteCategory(id: string) {
  const res = await httpClient.delete<DeleteCategoryResponse>(
    `/categories/${id}`
  );
  return res.data;
}

export {type Category};