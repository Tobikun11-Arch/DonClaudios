'use client';

import {
  closeMySupportConversation,
  closeSupportConversation,
  getMySupportConversation,
  getOrCreateSupportConversation,
  listAdminSupportConversations,
  listAdminSupportMessages,
  listSupportMessages,
  sendAdminSupportMessage,
  sendSupportMessage
} from '@/lib/api/supportApi';
import type {
  ListSupportMessagesResponse,
  SupportMessageResponse
} from '@/lib/api/supportApi';
import {
  adminNotificationsQueryKey,
  notificationsQueryKey
} from '@/lib/hooks/notifications/useNotifications';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const supportMyKey = ['support', 'my'] as const;
const supportMessagesKey = (conversationId: string) =>
  ['support', 'messages', conversationId] as const;
export const supportAdminConversationsKey = [
  'support',
  'admin',
  'conversations'
] as const;
const supportAdminMessagesKey = (conversationId: string) =>
  ['support', 'admin', 'messages', conversationId] as const;

export function useSupportMyQuery(
  guestSessionId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: [...supportMyKey, guestSessionId ?? ''],
    queryFn: () => getMySupportConversation(guestSessionId),
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useGetOrCreateSupportConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: getOrCreateSupportConversation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: supportMyKey});
    }
  });
}

export function useSupportMessagesQuery(
  conversationId: string | null,
  guestSessionId?: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: supportMessagesKey(conversationId ?? ''),
    queryFn: () => listSupportMessages(conversationId as string, guestSessionId),
    enabled: enabled && !!conversationId,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useSendSupportMessageMutation(
  conversationId: string,
  guestSessionId?: string | null
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({body}: {body: string}) =>
      sendSupportMessage(conversationId, body, guestSessionId),
    onSuccess: async (data: SupportMessageResponse) => {
      const key = supportMessagesKey(conversationId);
      queryClient.setQueryData<ListSupportMessagesResponse>(key, old => ({
        messages: old?.messages ? [...old.messages, data.message] : [data.message]
      }));
      await queryClient.invalidateQueries({queryKey: key});
      await queryClient.invalidateQueries({queryKey: supportMyKey});
      await queryClient.invalidateQueries({
        queryKey: adminNotificationsQueryKey
      });
    }
  });
}

export function useAdminSupportConversationsQuery(enabled = true) {
  return useQuery({
    queryKey: supportAdminConversationsKey,
    queryFn: listAdminSupportConversations,
    enabled,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useAdminSupportMessagesQuery(
  conversationId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: supportAdminMessagesKey(conversationId ?? ''),
    queryFn: () => listAdminSupportMessages(conversationId as string),
    enabled: enabled && !!conversationId,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useSendAdminSupportMessageMutation(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({body}: {body: string}) =>
      sendAdminSupportMessage(conversationId, body),
    onSuccess: async (data: SupportMessageResponse) => {
      const key = supportAdminMessagesKey(conversationId);
      queryClient.setQueryData<ListSupportMessagesResponse>(key, old => ({
        messages: old?.messages ? [...old.messages, data.message] : [data.message]
      }));
      await queryClient.invalidateQueries({queryKey: key});
      await queryClient.invalidateQueries({
        queryKey: supportAdminConversationsKey
      });
      await queryClient.invalidateQueries({queryKey: notificationsQueryKey});
    }
  });
}

export function useCloseSupportConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeSupportConversation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: supportAdminConversationsKey
      });
      await queryClient.invalidateQueries({
        queryKey: ['support', 'admin', 'messages']
      });
    }
  });
}

export function useCustomerCloseSupportConversationMutation(
  conversationId: string,
  guestSessionId?: string | null
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      closeMySupportConversation(conversationId, guestSessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: supportMyKey});
      await queryClient.invalidateQueries({
        queryKey: supportMessagesKey(conversationId)
      });
      await queryClient.invalidateQueries({
        queryKey: supportAdminConversationsKey
      });
    }
  });
}