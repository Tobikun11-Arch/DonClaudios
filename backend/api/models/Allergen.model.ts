import mongoose, {Schema} from 'mongoose';

/**
 * "allergen" is a real allergy warning (shown in red to customers);
 * "dietary" is a note such as pork or spicy (shown in grey).
 */
export const ALLERGEN_KINDS = ['allergen', 'dietary'] as const;
export type AllergenKind = (typeof ALLERGEN_KINDS)[number];

/**
 * The 12 allergens every store starts with. They live in code, not the
 * database, so they always exist and cannot be deleted. Their keys are what
 * older products already store.
 */
export const BUILT_IN_ALLERGENS: ReadonlyArray<{key: string; label: string; kind: AllergenKind}> = [
  {key: 'peanut', label: 'Peanuts', kind: 'allergen'},
  {key: 'tree_nut', label: 'Tree Nuts', kind: 'allergen'},
  {key: 'shellfish', label: 'Shellfish', kind: 'allergen'},
  {key: 'fish', label: 'Fish', kind: 'allergen'},
  {key: 'egg', label: 'Egg', kind: 'allergen'},
  {key: 'dairy', label: 'Dairy/Milk', kind: 'allergen'},
  {key: 'soy', label: 'Soy', kind: 'allergen'},
  {key: 'gluten', label: 'Gluten/Wheat', kind: 'allergen'},
  {key: 'sesame', label: 'Sesame', kind: 'allergen'},
  {key: 'pork', label: 'Pork', kind: 'dietary'},
  {key: 'beef', label: 'Beef', kind: 'dietary'},
  {key: 'spicy', label: 'Spicy', kind: 'dietary'}
];

/** An allergen the owner added on top of the built-in list. */
export interface AllergenDocument extends mongoose.Document {
  key: string;
  label: string;
  kind: AllergenKind;
  createdBy?: mongoose.Types.ObjectId;
}

const AllergenSchema = new Schema<AllergenDocument>(
  {
    key: {type: String, required: true, unique: true, trim: true, maxlength: 40},
    label: {type: String, required: true, trim: true, maxlength: 30},
    kind: {type: String, enum: [...ALLERGEN_KINDS], default: 'allergen'},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin'}
  },
  {timestamps: true}
);

export const AllergenModel = mongoose.model<AllergenDocument>(
  'Allergen',
  AllergenSchema,
  'allergens'
);

/** "Kiwi fruit" -> "kiwi_fruit", matching the built-in key style. */
export function allergenKeyFor(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}
