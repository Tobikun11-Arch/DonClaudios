import mongoose, {Schema} from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewAuthorType = 'customer' | 'admin';

export interface ReviewMessage {
  authorType: ReviewAuthorType;
  senderName: string;
  body: string;
  createdAt: Date;
}

export interface ReviewDocument extends mongoose.Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  reply?: string | null;
  replyDate?: Date | null;
  repliedBy?: mongoose.Types.ObjectId | null;
  messages: ReviewMessage[];
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
    repliedBy: {type: Schema.Types.ObjectId, ref: 'Admin', default: null},
    messages: [
      {
        authorType: {type: String, enum: ['customer', 'admin'], required: true},
        senderName: {type: String, required: true, trim: true},
        body: {type: String, required: true, trim: true},
        createdAt: {type: Date, default: Date.now}
      }
    ]
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
