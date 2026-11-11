import {httpClient} from './httpClient';
import type {AllergenKind, AllergenOption} from '@/lib/ingredients/allergenCatalog';

/** Public: built-in and owner-added allergens. */
export async function listAllergens() {
  const res = await httpClient.get<{allergens: AllergenOption[]}>('/allergens');
  return res.data.allergens;
}

/** Admin only. */
export async function createAllergen(body: {label: string; kind: AllergenKind}) {
  const res = await httpClient.post<{allergen: AllergenOption}>('/allergens', body);
  return res.data.allergen;
}

/** Admin only. Also removes the allergen from every product. */
export async function deleteAllergen(id: string) {
  const res = await httpClient.delete<{message: string; productsUpdated: number}>(
    `/allergens/${id}`
  );
  return res.data;
}
