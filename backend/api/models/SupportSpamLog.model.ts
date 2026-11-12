import mongoose, {Schema} from 'mongoose';

/**
 * Support chat attempts the spam guard blocked (guest chat starts and
 * messages). Kept 7 days for review / capstone demo, then auto-deleted.
 */
export interface SupportSpamLogDocument extends mongoose.Document {
  ip: string;
  customerType: 'guest' | 'account';
  conversationId: mongoose.Types.ObjectId | null;
  guestSessionId: string | null;
  /** Error code, e.g. SUPPORT_LINK_BLOCKED. */
  reason: string;
  /** First 200 characters of what was sent, for review. */
  preview: string;
  createdAt: Date;
}

const SupportSpamLogSchema = new Schema<SupportSpamLogDocument>(
  {
    ip: {type: String, required: true},
    customerType: {type: String, enum: ['guest', 'account'], required: true},
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportConversation',
      default: null
    },
    guestSessionId: {type: String, default: null},
    reason: {type: String, required: true},
    preview: {type: String, default: ''}
  },
  {timestamps: {createdAt: true, updatedAt: false}}
);

SupportSpamLogSchema.index({createdAt: 1}, {expireAfterSeconds: 7 * 24 * 60 * 60});
SupportSpamLogSchema.index({ip: 1, createdAt: -1});

export const SupportSpamLogModel = mongoose.model<SupportSpamLogDocument>(
  'SupportSpamLog',
  SupportSpamLogSchema,
  'support_spam_log'
);
