import {ApiError} from '../utils/error';
import {
  AllergenModel,
  BUILT_IN_ALLERGENS,
  allergenKeyFor,
  type AllergenKind
} from '../models/Allergen.model';
import {ProductModel} from '../models/Product.model';

export type AllergenOption = {
  /** Database id for owner-added allergens; null for built-ins. */
  id: string | null;
  key: string;
  label: string;
  kind: AllergenKind;
  builtIn: boolean;
};

export const allergenService = {
  /** Built-ins first (fixed order), then owner-added ones A–Z. */
  async list(): Promise<AllergenOption[]> {
    const custom = await AllergenModel.find().sort({label: 1}).lean();
    return [
      ...BUILT_IN_ALLERGENS.map(a => ({id: null, ...a, builtIn: true})),
      ...custom.map(a => ({
        id: String(a._id),
        key: a.key,
        label: a.label,
        kind: a.kind,
        builtIn: false
      }))
    ];
  },

  async create(adminId: string, data: {label: string; kind?: AllergenKind}) {
    const label = data.label.trim().replace(/\s+/g, ' ');
    const key = allergenKeyFor(label);
    if (!key) {
      throw new ApiError(400, 'ALLERGEN_INVALID', 'Use letters or numbers for the allergen name.');
    }

    // Same key or same name (ignoring case) as any existing allergen, built-in
    // or custom, is a duplicate: "peanuts" must not sit beside "Peanuts".
    const lower = label.toLowerCase();
    const clashesBuiltIn = BUILT_IN_ALLERGENS.some(
      a => a.key === key || a.label.toLowerCase() === lower
    );
    const clashesCustom = await AllergenModel.exists({
      $or: [{key}, {label: {$regex: `^${escapeRegex(label)}$`, $options: 'i'}}]
    });
    if (clashesBuiltIn || clashesCustom) {
      throw new ApiError(409, 'ALLERGEN_EXISTS', `"${label}" is already on the allergen list.`);
    }

    const created = await AllergenModel.create({
      key,
      label,
      kind: data.kind ?? 'allergen',
      createdBy: adminId
    });
    return {
      id: String(created._id),
      key: created.key,
      label: created.label,
      kind: created.kind,
      builtIn: false
    } satisfies AllergenOption;
  },

  /**
   * Deletes an owner-added allergen and removes it from every product, so no
   * product keeps pointing at a key the menu can no longer name.
   */
  async remove(id: string) {
    const deleted = await AllergenModel.findByIdAndDelete(id);
    if (!deleted) {
      throw new ApiError(404, 'ALLERGEN_NOT_FOUND', 'Allergen not found');
    }
    const result = await ProductModel.updateMany(
      {allergens: deleted.key},
      {$pull: {allergens: deleted.key}}
    );
    return {message: 'Deleted', productsUpdated: result.modifiedCount};
  },

  /**
   * Checks a product's allergen keys against the catalog. Returns them
   * de-duplicated; rejects any key that is not a built-in or owner-added one.
   */
  async assertKnown(keys: string[]): Promise<string[]> {
    const unique = [...new Set(keys.map(k => k.trim()).filter(Boolean))];
    if (unique.length === 0) return [];
    const builtIn = new Set(BUILT_IN_ALLERGENS.map(a => a.key));
    const toCheck = unique.filter(k => !builtIn.has(k));
    if (toCheck.length > 0) {
      const found = await AllergenModel.find({key: {$in: toCheck}}).select('key').lean();
      const foundKeys = new Set(found.map(a => a.key));
      const unknown = toCheck.filter(k => !foundKeys.has(k));
      if (unknown.length > 0) {
        throw new ApiError(
          400,
          'ALLERGEN_UNKNOWN',
          `Unknown allergen: ${unknown.join(', ')}. Add it to the allergen list first.`
        );
      }
    }
    return unique;
  }
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
