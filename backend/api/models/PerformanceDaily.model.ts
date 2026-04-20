import mongoose, {Schema} from 'mongoose';

export interface PerformanceTopProduct {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  revenue: number;
}

export interface PerformanceDailyDocument extends mongoose.Document {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  totalTransactions: number;
  topProducts: PerformanceTopProduct[];
}

const TopProductSchema = new Schema<PerformanceTopProduct>(
  {
    productId: {type: Schema.Types.ObjectId, ref: 'Product', required: true},
    quantity: {type: Number, required: true},
    revenue: {type: Number, required: true}
  },
  {_id: false}
);

const PerformanceDailySchema = new Schema<PerformanceDailyDocument>(
  {
    date: {type: String, required: true, unique: true},
    totalRevenue: {type: Number, default: 0},
    totalOrders: {type: Number, default: 0},
    totalTransactions: {type: Number, default: 0},
    topProducts: {type: [TopProductSchema], default: []}
  },
  {timestamps: true}
);

PerformanceDailySchema.index({date: 1}, {unique: true});

export const PerformanceDailyModel = mongoose.model<PerformanceDailyDocument>(
  'PerformanceDaily',
  PerformanceDailySchema,
  'performance_daily'
);
