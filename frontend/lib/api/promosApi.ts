import {httpClient} from './httpClient';
import type {
  CreatePromoBody,
  CreatePromoResponse,
  DeletePromoResponse,
  GetPromoResponse,
  ListPromosResponse,
  UpdatePromoBody,
  UpdatePromoResponse
} from '@/lib/types/promo';

export async function listPromos() {
  const res = await httpClient.get<ListPromosResponse>('/promos');
  return res.data;
}

export async function listPromosAdmin() {
  const res = await httpClient.get<ListPromosResponse>('/promos/admin');
  return res.data;
}

export async function getPromo(id: string) {
  const res = await httpClient.get<GetPromoResponse>(`/promos/${id}`);
  return res.data;
}

export async function createPromo(body: CreatePromoBody) {
  const res = await httpClient.post<CreatePromoResponse>('/promos', body);
  return res.data;
}

export async function updatePromo(params: {id: string; body: UpdatePromoBody}) {
  const res = await httpClient.patch<UpdatePromoResponse>(
    `/promos/${params.id}`,
    params.body
  );
  return res.data;
}

export async function deletePromo(id: string) {
  const res = await httpClient.delete<DeletePromoResponse>(`/promos/${id}`);
  return res.data;
}
