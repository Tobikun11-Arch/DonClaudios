import mongoose, {Schema} from 'mongoose';

export const INGREDIENT_STATUSES = ['active', 'pending'] as const;

export type IngredientStatus = (typeof INGREDIENT_STATUSES)[number];

export interface IngredientDocument extends mongoose.Document {
  key: string;
  name: string;
  iconKey: string;
  status: IngredientStatus;
  createdBy?: mongoose.Types.ObjectId;
}

const IngredientSchema = new Schema<IngredientDocument>(
  {
    key: {type: String, required: true, unique: true, trim: true},
    name: {type: String, required: true, trim: true, maxlength: 80},
    iconKey: {type: String, required: true, trim: true, maxlength: 64},
    status: {
      type: String,
      enum: [...INGREDIENT_STATUSES],
      default: 'pending'
    },
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin'}
  },
  {timestamps: true}
);

IngredientSchema.index({status: 1});

export const IngredientModel = mongoose.model<IngredientDocument>(
  'Ingredient',
  IngredientSchema,
  'ingredients'
);

export function slugifyIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}