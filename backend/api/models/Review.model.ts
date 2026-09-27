import mongoose, {Schema} from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export type ReviewAuthorType = 'customer' | 'admin';

export type ReviewModerationAction = 'allow' | 'auto_reject' | 'manual';

export interface ReviewModeration {
  action: ReviewModerationAction;
  score: number;
  matchedWords: string[];
}

export interface ReviewMessage {
  authorType: ReviewAuthorType;
  senderName: string;
  body: string;
  createdAt: Date;
}

export interface ReviewImage {
  url: string;
  alt?: string;
}

export interface ReviewDocument extends mongoose.Document {
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  orderId?: mongoose.Types.ObjectId | null;
  images?: ReviewImage[];
  reply?: string | null;
  replyDate?: Date | null;
  repliedBy?: mongoose.Types.ObjectId | null;
  moderation?: ReviewModeration | null;
  isAutoRejected?: boolean;
  moderatedBy?: mongoose.Types.ObjectId | null;
  moderatedAt?: Date | null;
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
    orderId: {type: Schema.Types.ObjectId, ref: 'Order', default: null},
    images: [
      {
        url: {type: String, required: true},
        alt: {type: String, default: ''}
      }
    ],
    reply: {type: String, default: null, trim: true},
    replyDate: {type: Date, default: null},
    repliedBy: {type: Schema.Types.ObjectId, ref: 'Admin', default: null},
    moderation: {
      type: {
        action: {type: String, enum: ['allow', 'auto_reject', 'manual']},
        score: {type: Number, default: 0},
        matchedWords: {type: [String], default: []}
      },
      default: null
    },
    isAutoRejected: {type: Boolean, default: false},
    moderatedBy: {type: Schema.Types.ObjectId, ref: 'Admin', default: null},
    moderatedAt: {type: Date, default: null},
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
ReviewSchema.index({status: 1, isAutoRejected: 1, createdAt: -1});
ReviewSchema.index({customerId: 1, createdAt: -1});
ReviewSchema.index(
  {customerId: 1, orderId: 1},
  {unique: true, partialFilterExpression: {orderId: {$ne: null}}}
);

export const ReviewModel = mongoose.model<ReviewDocument>(
  'Review',
  ReviewSchema,
  'reviews'
);
