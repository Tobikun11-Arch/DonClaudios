import mongoose, {Schema} from 'mongoose';

export const CATEGORY_TYPES = ['catering', 'in_store'] as const;

export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const STOCK_UNITS = ['kg', 'piece', 'can', 'pitcher'] as const;

export type StockUnit = (typeof STOCK_UNITS)[number];

export interface CategoryDocument extends mongoose.Document {
  key: string;
  name: string;
  type: CategoryType;
  stockUnit: StockUnit;
  sortOrder: number;
  imageUrl?: string | null;
  createdBy?: mongoose.Types.ObjectId;
}

const CategorySchema = new Schema<CategoryDocument>(
  {
    key: {type: String, required: true, unique: true, trim: true},
    name: {type: String, required: true, trim: true, maxlength: 40},
    type: {
      type: String,
      enum: [...CATEGORY_TYPES],
      required: true
    },
    stockUnit: {
      type: String,
      enum: [...STOCK_UNITS],
      required: true
    },
    sortOrder: {type: Number, default: 0},
    imageUrl: {type: String, default: null},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin'}
  },
  {timestamps: true}
);

CategorySchema.index({type: 1});

export const CategoryModel = mongoose.model<CategoryDocument>(
  'Category',
  CategorySchema,
  'categories'
);

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}