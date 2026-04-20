import mongoose, {Schema} from 'mongoose';

export interface OrderItemDocument extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  specialRequest?: string;
}

const OrderItemSchema = new Schema<OrderItemDocument>(
  {
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
    quantity: {type: Number, required: true},
    price: {type: Number, required: true},
    specialRequest: {type: String}
  },
  {timestamps: true}
);

OrderItemSchema.index({orderId: 1});
OrderItemSchema.index({productId: 1});

export const OrderItemModel = mongoose.model<OrderItemDocument>(
  'OrderItem',
  OrderItemSchema,
  'order_items'
);
