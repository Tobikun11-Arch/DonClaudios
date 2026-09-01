import mongoose, {Schema} from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface ReviewDocument extends mongoose.Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  reply?: string | null;
  replyDate?: Date | null;
  repliedBy?: mongoose.Types.ObjectId | null;
}

const ReviewSchema = new Schema<ReviewDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    customerName: {type: String, required: true, trim: true},
    rating: {type: Number, required: true, min: 1, max: 5},
    comment: {type: String, required: true, trim: true},
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reply: {type: String, default: null, trim: true},
    replyDate: {type: Date, default: null},
    repliedBy: {type: Schema.Types.ObjectId, ref: 'Admin', default: null}
  },
  {timestamps: true}
);

ReviewSchema.index({status: 1, createdAt: -1});
ReviewSchema.index({customerId: 1, createdAt: -1});

export const ReviewModel = mongoose.model<ReviewDocument>(
  'Review',
  ReviewSchema,
  'reviews'
);
