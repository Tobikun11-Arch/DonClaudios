import mongoose, {Schema} from 'mongoose';
import {
  INQUIRY_CATEGORIES,
  type InquiryCategory,
  type InquiryPriority,
  type InquiryStatus
} from '../config/supportInquiry';

export type SupportCustomerType = 'guest' | 'account';
export type SupportConversationStatus = 'open' | 'closed';
export type SupportConversationCloser = 'owner' | 'customer';

export interface SupportConversationDocument extends mongoose.Document {
  customerId?: mongoose.Types.ObjectId | null;
  customerType: SupportCustomerType;
  guestName?: string | null;
  guestContact?: string | null;
  guestSessionId?: string | null;
  status: SupportConversationStatus;
  closedBy?: SupportConversationCloser | null;
  closedAt?: Date | null;
  lastMessageAt: Date;
  createdAt: Date;
  // Inquiry queue summary, kept in sync by support.service.
  /** Type of the latest customer inquiry. */
  category: InquiryCategory;
  /** 'urgent' while at least one pending inquiry in it is urgent. */
  priority: InquiryPriority;
  inquiryStatus: InquiryStatus;
  /** When the oldest unanswered inquiry arrived (null when answered). */
  pendingSince: Date | null;
  pendingCount: number;
  /** IP that started the chat (guest chat-start limit). */
  createdIp?: string | null;
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
    createdIp: {type: String, default: null},
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    closedBy: {type: String, enum: ['owner', 'customer'], default: null},
    closedAt: {type: Date, default: null},
    lastMessageAt: {type: Date, default: Date.now},
    category: {type: String, enum: INQUIRY_CATEGORIES, default: 'general'},
    priority: {type: String, enum: ['urgent', 'normal'], default: 'normal'},
    inquiryStatus: {
      type: String,
      enum: ['pending', 'answered'],
      default: 'answered'
    },
    pendingSince: {type: Date, default: null},
    pendingCount: {type: Number, default: 0}
  },
  {timestamps: true}
);

SupportConversationSchema.index({guestSessionId: 1});
SupportConversationSchema.index({customerId: 1});
SupportConversationSchema.index({createdIp: 1, customerType: 1, createdAt: -1});
SupportConversationSchema.index({status: 1, lastMessageAt: -1});
SupportConversationSchema.index({inquiryStatus: 1, priority: 1, pendingSince: 1});
// Change-check poll (GET /changes).
SupportConversationSchema.index({updatedAt: -1});

export const SupportConversationModel = mongoose.model<SupportConversationDocument>(
  'SupportConversation',
  SupportConversationSchema,
  'supportconversations'
);
