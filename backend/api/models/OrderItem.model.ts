import mongoose, {Schema} from 'mongoose';

/** What one unit of a bundle line contained when it was ordered. */
export interface OrderItemBundleComponent {
  productId: mongoose.Types.ObjectId;
  name: string;
  qty: number;
}

export interface OrderItemDocument extends mongoose.Document {
  orderId: mongoose.Types.ObjectId;
  /**
   * The product sold. For a bundle line this is the bundle promo's id (there
   * is no product for it); `promoId` and `bundleItems` are then set and stock
   * moves through the components instead (services/bundle.service.ts).
   */
  productId: mongoose.Types.ObjectId;
  /** Name at the time of ordering, so history survives renames and deletes. */
  name?: string | null;
  /** Set on bundle lines only. */
  promoId?: mongoose.Types.ObjectId | null;
  /** Set on bundle lines only: contents of ONE bundle. */
  bundleItems?: OrderItemBundleComponent[] | null;
  quantity: number;
  price: number;
  prepTimeMinutes?: number;
  specialRequest?: string;
  /**
   * The pre-order batch ("HH:MM" store-local start) this item was bought
   * in, stamped at order creation so a later cancel restores the stock to
   * the right batch even if the owner has since edited the schedule.
   */
  preOrderBatchStart?: string | null;
  /** Dated pre-orders: the size bought (id within the PreOrderEvent) + label snapshot. */
  preOrderSizeId?: mongoose.Types.ObjectId | null;
  sizeLabel?: string | null;
}

const OrderItemSchema = new Schema<OrderItemDocument>(
  {
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
    name: {type: String, default: null},
    promoId: {type: Schema.Types.ObjectId, ref: 'Promo', default: null},
    bundleItems: {
      type: [
        new Schema<OrderItemBundleComponent>(
          {
            productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
            name: {type: String, required: true},
            qty: {type: Number, required: true, min: 1}
          },
          {_id: false}
        )
      ],
      default: undefined
    },
    quantity: {type: Number, required: true},
    price: {type: Number, required: true},
    prepTimeMinutes: {type: Number, min: 0, max: 1440, default: null},
    specialRequest: {type: String},
    preOrderBatchStart: {type: String, default: null},
    preOrderSizeId: {type: Schema.Types.ObjectId, default: null},
    sizeLabel: {type: String, default: null}
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
