import mongoose, {Schema} from 'mongoose';

export interface ProductDocument extends mongoose.Document {
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const ProductSchema = new Schema<ProductDocument>(
  {
    name: {type: String, required: true, trim: true},
    category: {type: String, required: true, trim: true},
    price: {type: Number, required: true, min: 0},
    stock: {type: Number, required: true, min: 0},
    description: {type: String},
    imageUrl: {type: String},
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
