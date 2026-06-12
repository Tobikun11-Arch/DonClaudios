import mongoose, {Schema} from 'mongoose';

export type StockMovementType = 'restock' | 'adjustment' | 'spoilage' | 'sold';

export interface StockMovementDocument extends mongoose.Document {
  productId: mongoose.Types.ObjectId;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  performedBy: mongoose.Types.ObjectId;
}

const StockMovementSchema = new Schema<StockMovementDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    type: {
      type: String,
      enum: ['restock', 'adjustment', 'spoilage', 'sold'],
      required: true
    },
    quantity: {type: Number, required: true},
    previousStock: {type: Number, required: true},
    newStock: {type: Number, required: true},
    note: {type: String},
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Admin',
      required: true
    }
  },
  {timestamps: true}
);

StockMovementSchema.index({productId: 1, createdAt: -1});

export const StockMovementModel = mongoose.model<StockMovementDocument>(
  'StockMovement',
  StockMovementSchema,
  'stock_movements'
);
