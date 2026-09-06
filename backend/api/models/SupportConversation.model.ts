import mongoose, {Schema} from 'mongoose';

export type SupportCustomerType = 'guest' | 'account';
export type SupportConversationStatus = 'open' | 'closed';

export interface SupportConversationDocument extends mongoose.Document {
  customerId?: mongoose.Types.ObjectId | null;
  customerType: SupportCustomerType;
  guestName?: string | null;
  guestContact?: string | null;
  guestSessionId?: string | null;
  status: SupportConversationStatus;
  lastMessageAt: Date;
  createdAt: Date;
}

const SupportConversationSchema = new Schema<SupportConversationDocument>(
  {
    customerId: {type: Schema.Types.ObjectId, ref: 'Customer', default: null},
    customerType: {
      type: String,
      enum: ['guest', 'account'],
      required: true
    },
    guestName: {type: String, default: null, trim: true},
    guestContact: {type: String, default: null, trim: true},
    guestSessionId: {type: String, default: null},
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    lastMessageAt: {type: Date, default: Date.now}
  },
  {timestamps: true}
);

SupportConversationSchema.index({guestSessionId: 1});
SupportConversationSchema.index({customerId: 1});
SupportConversationSchema.index({status: 1, lastMessageAt: -1});

export const SupportConversationModel = mongoose.model<SupportConversationDocument>(
  'SupportConversation',
  SupportConversationSchema,
  'supportconversations'
);