import {httpClient} from './httpClient';
import type {
  InquiryCategory,
  InquiryPriority,
  InquiryStatus
} from '@/lib/support/inquiry';

export type SupportConversation = {
  _id: string;
  customerType: 'guest' | 'account';
  customerId?: string | null;
  guestName?: string | null;
  guestContact?: string | null;
  guestSessionId?: string | null;
  status: 'open' | 'closed';
  closedBy?: 'owner' | 'customer' | null;
  closedAt?: string | null;
  lastMessageAt: string;
  createdAt: string;
  displayName?: string;
  contact?: string;
  lastMessage?: string;
  lastSender?: string;
  unreadCount?: number;
  // Inquiry queue summary
  category?: InquiryCategory;
  priority?: InquiryPriority;
  inquiryStatus?: InquiryStatus;
  pendingSince?: string | null;
  pendingCount?: number;
};

export type SupportMessage = {
  _id: string;
  conversationId: string;
  senderType: 'customer' | 'owner' | 'system';
  senderName: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
  category?: InquiryCategory | null;
  priority?: InquiryPriority | null;
  inquiryStatus?: InquiryStatus | null;
  autoFlagged?: boolean;
  matchedKeywords?: string[];
  answeredAt?: string | null;
};

export type SupportInquiry = {
  _id: string;
  conversationId: string;
  customerType: 'guest' | 'account';
  senderName: string;
  body: string;
  category: InquiryCategory;
  priority: InquiryPriority;
  inquiryStatus: InquiryStatus;
  autoFlagged: boolean;
  matchedKeywords: string[];
  createdAt: string;
  answeredAt: string | null;
  answeredVia: 'reply' | 'manual' | null;
  responseMinutes: number | null;
};

export type SupportQueueStats = {
  rangeDays: number;
  pending: number;
  urgentPending: number;
  pendingByCategory: Record<string, {count: number; urgent: number}>;
  received: number;
  answered: number;
  customerClosed: number;
  urgentReceived: number;
  autoFlagged: number;
  avgResponseMinutes: number | null;
  avgUrgentResponseMinutes: number | null;
  avgNormalResponseMinutes: number | null;
};

export type GetMySupportResponse = {
  conversation: SupportConversation | null;
  unreadCount: number;
};

export type GetOrCreateConversationInput = {
  guestSessionId?: string;
  guestName?: string;
  guestContact?: string;
  /** Anti-spam honeypot (must stay empty). */
  website?: string;
};

export type GetOrCreateConversationResponse = {
  conversation: SupportConversation;
};

export type ListSupportMessagesResponse = {
  messages: SupportMessage[];
};

export type ListAdminSupportConversationsResponse = {
  conversations: SupportConversation[];
};

export type SupportMessageResponse = {
  message: SupportMessage;
  /** Automatic acknowledgement posted right after a customer message. */
  autoReply?: SupportMessage | null;
};

function guestHeaders(guestSessionId?: string | null) {
  return guestSessionId
    ? {'x-guest-session-id': guestSessionId}
    : undefined;
}

export async function getMySupportConversation(guestSessionId?: string | null) {
  const res = await httpClient.get<GetMySupportResponse>('/support/my', {
    headers: guestHeaders(guestSessionId)
  });
  return res.data;
}

export async function getOrCreateSupportConversation(
  body: GetOrCreateConversationInput
) {
  const res = await httpClient.post<GetOrCreateConversationResponse>(
    '/support/conversations',
    body
  );
  return res.data;
}

export async function listSupportMessages(
  conversationId: string,
  guestSessionId?: string | null
) {
  const res = await httpClient.get<ListSupportMessagesResponse>(
    `/support/conversations/${conversationId}/messages`,
    {headers: guestHeaders(guestSessionId)}
  );
  return res.data;
}

export async function sendSupportMessage(
  conversationId: string,
  body: string,
  guestSessionId?: string | null,
  category?: InquiryCategory
) {
  const res = await httpClient.post<SupportMessageResponse>(
    `/support/conversations/${conversationId}/messages`,
    {body, category},
    {headers: guestHeaders(guestSessionId)}
  );
  return res.data;
}

export async function listAdminSupportConversations() {
  const res = await httpClient.get<ListAdminSupportConversationsResponse>(
    '/support/admin/conversations'
  );
  return res.data;
}

export async function listAdminSupportMessages(conversationId: string) {
  const res = await httpClient.get<ListSupportMessagesResponse>(
    `/support/admin/conversations/${conversationId}/messages`
  );
  return res.data;
}

export async function sendAdminSupportMessage(
  conversationId: string,
  body: string
) {
  const res = await httpClient.post<SupportMessageResponse>(
    `/support/admin/conversations/${conversationId}/messages`,
    {body}
  );
  return res.data;
}

export async function closeSupportConversation(conversationId: string) {
  const res = await httpClient.patch<{conversation: SupportConversation}>(
    `/support/admin/conversations/${conversationId}/close`
  );
  return res.data;
}

export async function closeMySupportConversation(
  conversationId: string,
  guestSessionId?: string | null
) {
  const res = await httpClient.patch<{conversation: SupportConversation}>(
    `/support/conversations/${conversationId}/close`,
    {},
    {headers: guestHeaders(guestSessionId)}
  );
  return res.data;
}
export async function listAdminSupportInquiries(
  params: {
    status?: InquiryStatus;
    category?: InquiryCategory;
    priority?: InquiryPriority;
  } = {}
) {
  const res = await httpClient.get<{inquiries: SupportInquiry[]}>(
    '/support/admin/inquiries',
    {params}
  );
  return res.data;
}

export async function getAdminSupportQueueStats(days = 7) {
  const res = await httpClient.get<{stats: SupportQueueStats}>(
    '/support/admin/queue-stats',
    {params: {days}}
  );
  return res.data;
}

export async function markSupportConversationAnswered(conversationId: string) {
  const res = await httpClient.patch<{conversation: SupportConversation}>(
    `/support/admin/conversations/${conversationId}/answered`
  );
  return res.data;
}

// ---- Cashier: urgent inquiries only ----
export async function listCashierUrgentSupport() {
  const res = await httpClient.get<ListAdminSupportConversationsResponse>(
    '/support/cashier/urgent'
  );
  return res.data;
}

export async function listCashierSupportMessages(conversationId: string) {
  const res = await httpClient.get<ListSupportMessagesResponse>(
    `/support/cashier/conversations/${conversationId}/messages`
  );
  return res.data;
}

export async function sendCashierSupportMessage(
  conversationId: string,
  body: string
) {
  const res = await httpClient.post<SupportMessageResponse>(
    `/support/cashier/conversations/${conversationId}/messages`,
    {body}
  );
  return res.data;
}
