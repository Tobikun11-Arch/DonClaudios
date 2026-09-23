import mongoose, {Schema} from 'mongoose';

export const ALLERGEN_VALUES = [
  'peanut',
  'tree_nut',
  'shellfish',
  'fish',
  'egg',
  'dairy',
  'soy',
  'gluten',
  'sesame',
  'pork',
  'beef',
  'spicy'
] as const;

export type ProductAllergen = (typeof ALLERGEN_VALUES)[number];

export interface ProductIngredient {
  name: string;
  iconKey: string;
}

export interface ProductDocument extends mongoose.Document {
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  ingredients: ProductIngredient[];
  allergens: ProductAllergen[];
  createdBy: mongoose.Types.ObjectId;
}

const ProductIngredientSchema = new Schema<ProductIngredient>(
  {
    name: {type: String, required: true, trim: true, maxlength: 80},
    iconKey: {type: String, required: true, trim: true, maxlength: 64}
  },
  {_id: false}
);

const ProductSchema = new Schema<ProductDocument>(
  {
    name: {type: String, required: true, trim: true},
    category: {type: String, required: true, trim: true},
    price: {type: Number, required: true, min: 0},
    stock: {type: Number, required: true, min: 0},
    description: {type: String},
    imageUrl: {type: String},
    ingredients: {type: [ProductIngredientSchema], default: []},
    allergens: {type: [String], enum: [...ALLERGEN_VALUES], default: []},
    isAvailable: {type: Boolean, default: true},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin', required: true}
  },
  {timestamps: true}
);

ProductSchema.index({category: 1});
ProductSchema.index({isAvailable: 1});

export const ProductModel = mongoose.model<ProductDocument>(
  'Product',
  ProductSchema,
  'products'
);
