import mongoose, {Schema} from 'mongoose';

export type SupportMessageSenderType = 'customer' | 'owner';

export interface SupportMessageDocument extends mongoose.Document {
  conversationId: mongoose.Types.ObjectId;
  senderType: SupportMessageSenderType;
  senderName: string;
  body: string;
  createdAt: Date;
  readAt?: Date | null;
}

const SupportMessageSchema = new Schema<SupportMessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportConversation',
      required: true
    },
    senderType: {
      type: String,
      enum: ['customer', 'owner'],
      required: true
    },
    senderName: {type: String, required: true, trim: true},
    body: {type: String, required: true, trim: true},
    readAt: {type: Date, default: null}
  },
  {timestamps: true}
);

SupportMessageSchema.index({conversationId: 1, createdAt: 1});

export const SupportMessageModel = mongoose.model<SupportMessageDocument>(
  'SupportMessage',
  SupportMessageSchema,
  'supportmessages'
);