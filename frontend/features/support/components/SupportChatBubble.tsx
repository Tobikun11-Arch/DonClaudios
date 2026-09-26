'use client';

import {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {X} from 'lucide-react';
import {toast} from 'sonner';
import SupportChatPanel from './SupportChatPanel';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {
  useGetOrCreateSupportConversationMutation,
  useSupportMyQuery
} from '@/lib/hooks/support/useSupport';
import {getGuestSessionId} from '@/lib/support/guestSessionStorage';
import {
  supportBubbleClass,
  supportPanelHeightCustomerClass
} from '@/lib/support/supportBubblePosition';
import type {NormalizedApiError} from '@/lib/api/types';

export default function SupportChatBubble() {
  const [open, setOpen] = useState(false);
  const [localConversationId, setLocalConversationId] = useState<
    string | null
  >(null);
  const [createFailed, setCreateFailed] = useState(false);
  const creatingForLoggedIn = useRef(false);
  const {data: me} = useMeQuery();
  const isLoggedIn = !!me?.user;

  const guestSessionId = isLoggedIn ? null : getGuestSessionId();

  const myQuery = useSupportMyQuery(
    isLoggedIn ? null : guestSessionId,
    true
  );
  const getOrCreateMutation = useGetOrCreateSupportConversationMutation();

  const queryConversation = myQuery.data?.conversation ?? null;
  const conversationId =
    localConversationId ?? queryConversation?._id ?? null;
  const unreadCount =
    !open && queryConversation ? (myQuery.data?.unreadCount ?? 0) : 0;

  useEffect(() => {
    if (
      open &&
      isLoggedIn &&
      !conversationId &&
      !createFailed &&
      !creatingForLoggedIn.current &&
      !myQuery.isLoading
    ) {
      creatingForLoggedIn.current = true;
      getOrCreateMutation
        .mutateAsync({})
        .then(res => {
          setLocalConversationId(res.conversation._id);
        })
        .catch(() => {
          creatingForLoggedIn.current = false;
          setCreateFailed(true);
        });
    }
  }, [open, isLoggedIn, conversationId, myQuery.isLoading, createFailed]);

  const handleOpen = () => {
    setOpen(true);
    setCreateFailed(false);
  };
  const handleClose = () => {
    setOpen(false);
    setLocalConversationId(null);
  };

  const handleConversationCreated = (id: string) => {
    setLocalConversationId(id);
    setCreateFailed(false);
    setOpen(true);
  };

  const handleRetryCreate = () => {
    setCreateFailed(false);
    setLocalConversationId(null);
  };

  const handleIdentityError = (error: unknown) => {
    toast.error(
      (error as NormalizedApiError)?.message ??
        'Could not start support chat. Please try again.'
    );
  };

  const viewerName = isLoggedIn
    ? [me?.user?.firstName, me?.user?.lastName]
        .filter(Boolean)
        .join(' ') || null
    : null;

  return (
    <div className={supportBubbleClass}>
      {open && (
        <div
          className={`${supportPanelHeightCustomerClass} mb-3 flex w-[calc(100vw-2.5rem)] max-w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-[#2d4a35] px-4 py-3 text-white">
            <div>
              <p className="text-sm font-bold leading-tight">
                Chat with DonClaudio&apos;s
              </p>
              <p className="text-[11px] text-[#b8d4c0]">
                Support &amp; pre-order questions
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X size={16} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <SupportChatPanel
              conversationId={conversationId}
              isGuest={!isLoggedIn}
              guestSessionId={guestSessionId}
              viewerName={viewerName}
              conversationStatus={queryConversation?.status ?? 'open'}
              closedBy={queryConversation?.closedBy ?? null}
              creationFailed={createFailed}
              onRetryStart={handleRetryCreate}
              onConversationCreated={handleConversationCreated}
              onIdentityError={handleIdentityError}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => (open ? handleClose() : handleOpen())}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2d4a35] text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Open support chat"
      >
        {open ? (
          <Image
            src="/assets/no_support.png"
            alt="Close support chat"
            width={56}
            height={56}
            className="h-full w-full rounded-full object-cover"
            priority
          />
        ) : (
          <Image
            src="/assets/don_support.png"
            alt="Chat with DonClaudio's"
            width={56}
            height={56}
            className="h-full w-full rounded-full object-cover"
            priority
          />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}