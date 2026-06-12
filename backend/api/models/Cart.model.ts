import mongoose, {Schema} from 'mongoose';

export interface CartItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export interface CartDocument extends mongoose.Document {
  customerId: mongoose.Types.ObjectId;
  items: CartItem[];
  updatedAt: Date;
}

const CartItemSchema = new Schema<CartItem>(
  {
    productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
    name: {type: String, required: true},
    price: {type: Number, required: true},
    quantity: {type: Number, required: true, min: 1},
    imageUrl: {type: String}
  },
  {_id: false}
);

const CartSchema = new Schema<CartDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true 
    },
    items: {type: [CartItemSchema], default: []}
  },
  {timestamps: true}
);

export const CartModel = mongoose.model<CartDocument>(
  'Cart',
  CartSchema,
  'carts'
);
