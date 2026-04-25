import mongoose, {Schema} from 'mongoose';

export interface PromoDocument extends mongoose.Document {
  title: string;
  description?: string;
  discountRate: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const PromoSchema = new Schema<PromoDocument>(
  {
    title: {type: String, required: true, trim: true},
    description: {type: String},
    discountRate: {type: Number, required: true, min: 0},
    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
    isActive: {type: Boolean, default: true},
    createdBy: {type: Schema.Types.ObjectId, ref: 'Admin', required: true}
  },
  {timestamps: true}
);

PromoSchema.index({isActive: 1});
PromoSchema.index({startDate: 1, endDate: 1});

export const PromoModel = mongoose.model<PromoDocument>('Promo', PromoSchema, 'promos');
