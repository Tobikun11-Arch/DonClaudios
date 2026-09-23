import {httpClient} from './httpClient';
import type {
  CreateIngredientBody,
  CreateIngredientResponse,
  DeleteIngredientResponse,
  ListIngredientsResponse,
  UpdateIngredientBody,
  UpdateIngredientResponse
} from '@/lib/types/ingredient';

export async function listIngredients() {
  const res = await httpClient.get<ListIngredientsResponse>('/ingredients');
  return res.data;
}

export async function createIngredient(body: CreateIngredientBody) {
  const res = await httpClient.post<CreateIngredientResponse>(
    '/ingredients',
    body
  );
  return res.data;
}

export async function updateIngredient(params: {
  id: string;
  body: UpdateIngredientBody;
}) {
  const res = await httpClient.patch<UpdateIngredientResponse>(
    `/ingredients/${params.id}`,
    params.body
  );
  return res.data;
}

export async function deleteIngredient(id: string) {
  const res = await httpClient.delete<DeleteIngredientResponse>(
    `/ingredients/${id}`
  );
  return res.data;
}