import mongoose, {Schema} from 'mongoose';

export interface PromoDocument extends mongoose.Document {
  title: string;
  description?: string;
  imageUrl?: string;
  promoType: 'percentage' | 'fixed_amount' | 'bundle';
  price?: number;
  discountRate?: number;
  discountAmount?: number;
  productIds?: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const PromoSchema = new Schema<PromoDocument>(
  {
    title: {type: String, required: true, trim: true},
    description: {type: String},
    imageUrl: {type: String},
    promoType: {
      type: String,
      enum: ['percentage', 'fixed_amount', 'bundle'],
      required: true
    },
    price: {type: Number, min: 0},
    discountRate: {type: Number, min: 0},
    discountAmount: {type: Number, min: 0},
    productIds: [{type: Schema.Types.ObjectId, ref: 'Product'}],
    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
    isActive: {type: Boolean, default: true},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin', required: true}
  },
  {timestamps: true}
);

PromoSchema.index({isActive: 1});
PromoSchema.index({startDate: 1, endDate: 1});
PromoSchema.index({promoType: 1});

export const PromoModel = mongoose.model<PromoDocument>(
  'Promo',
  PromoSchema,
  'promos'
);
