import {httpClient} from './httpClient';

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
};

export type SupportMessage = {
  _id: string;
  conversationId: string;
  senderType: 'customer' | 'owner';
  senderName: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};

export type GetMySupportResponse = {
  conversation: SupportConversation | null;
  unreadCount: number;
};

export type GetOrCreateConversationInput = {
  guestSessionId?: string;
  guestName?: string;
  guestContact?: string;
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
  guestSessionId?: string | null
) {
  const res = await httpClient.post<SupportMessageResponse>(
    `/support/conversations/${conversationId}/messages`,
    {body},
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