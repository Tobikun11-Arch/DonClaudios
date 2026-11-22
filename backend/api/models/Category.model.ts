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
  /** Menu position: lower first. Add-ons are always shown last regardless. */
  sortOrder: number;
  /** Shown as a chip in the menu's top category bar (the rest are in the Categories panel). */
  showInTopBar?: boolean;
  imageUrl?: string | null;
  /**
   * Minimum notice (hours) customers must give for products of this category
   * (e.g. lechon takes hours to roast). Null = none, except the lechon
   * categories, which fall back to the Ordering Rules default.
   */
  minNoticeHours?: number | null;
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
    showInTopBar: {type: Boolean, default: false},
    imageUrl: {type: String, default: null},
    minNoticeHours: {type: Number, min: 0, max: 72, default: null},
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