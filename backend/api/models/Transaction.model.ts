import mongoose, {Schema} from 'mongoose';

export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'other';

export interface TransactionDocument extends mongoose.Document {
  cashierId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  timestamp: Date;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  isOnline: boolean;
}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    cashierId: {type: Schema.Types.ObjectId, ref: 'Cashier', required: true},
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', required: true},
    timestamp: {type: Date, default: Date.now},
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'gcash', 'other'],
      default: 'cash'
    },
    totalAmount: {type: Number, required: true},
    isOnline: {type: Boolean, default: true}
  },
  {timestamps: true}
);

TransactionSchema.index({cashierId: 1, timestamp: -1});
TransactionSchema.index({orderId: 1}, {unique: true});

export const TransactionModel = mongoose.model<TransactionDocument>(
  'Transaction',
  TransactionSchema,
  'transactions'
);
