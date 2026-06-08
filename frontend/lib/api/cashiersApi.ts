import {httpClient} from './httpClient';
import type {
  CreateCashierBody,
  CreateCashierResponse,
  DeleteCashierResponse,
  GetCashierResponse,
  ListCashiersResponse,
  UpdateCashierBody,
  UpdateCashierResponse
} from '@/lib/types/cashier';

export async function listCashiers() {
  const res = await httpClient.get<ListCashiersResponse>('/cashiers');
  return res.data;
}

export async function getCashier(id: string) {
  const res = await httpClient.get<GetCashierResponse>(`/cashiers/${id}`);
  return res.data;
}

export async function createCashier(body: CreateCashierBody) {
  const res = await httpClient.post<CreateCashierResponse>('/cashiers', body);
  return res.data;
}

export async function updateCashier(params: {
  id: string;
  body: UpdateCashierBody;
}) {
  const res = await httpClient.patch<UpdateCashierResponse>(
    `/cashiers/${params.id}`,
    params.body
  );
  return res.data;
}

export async function deleteCashier(id: string) {
  const res = await httpClient.delete<DeleteCashierResponse>(
    `/cashiers/${id}`
  );
  return res.data;
}
