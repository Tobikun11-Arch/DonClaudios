'use client';

import {useEffect, useRef, useState} from 'react';
import {Send, Loader2, Clock, RotateCw} from 'lucide-react';
import SupportMessageBubble from './SupportMessageBubble';
import GuestIdentityForm from './GuestIdentityForm';
import {
  useGetOrCreateSupportConversationMutation,
  useSupportMessagesQuery,
  useSendSupportMessageMutation
} from '@/lib/hooks/support/useSupport';
import {ensureGuestSessionId} from '@/lib/support/guestSessionStorage';

type PendingItem = {
  id: string;
  body: string;
  failed: boolean;
  sent?: boolean;
};

export default function SupportChatPanel({
  conversationId,
  isGuest,
  guestSessionId,
  viewerName,
  creationFailed,
  onRetryStart,
  onConversationCreated,
  onIdentityError
}: {
  conversationId: string | null;
  isGuest: boolean;
  guestSessionId: string | null;
  viewerName?: string | null;
  creationFailed?: boolean;
  onRetryStart?: () => void;
  onConversationCreated: (id: string) => void;
  onIdentityError: (error: unknown) => void;
}) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [senderName, setSenderName] = useState<string | null>(null);
  const [guestSessionIdState] = useState<string | null>(() =>
    isGuest ? guestSessionId ?? ensureGuestSessionId() : null
  );
  const tempCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayName = senderName ?? viewerName ?? null;

  const getOrCreateMutation = useGetOrCreateSupportConversationMutation();
  const sendMutation = useSendSupportMessageMutation(
    conversationId ?? '',
    guestSessionIdState
  );
  const messagesQuery = useSupportMessagesQuery(
    conversationId,
    guestSessionIdState,
    !!conversationId
  );

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [conversationId, messagesQuery.data?.messages, pending]);

  const allMessages = messagesQuery.data?.messages ?? [];
  const sending = sendMutation.isPending;
  const confirmedBodies = new Set(allMessages.map(m => m.body));
  const visiblePending = pending.filter(
    p => p.failed || !confirmedBodies.has(p.body)
  );

  const handleGuestSubmit = async (data: {name: string; contact: string}) => {
    const sid = guestSessionIdState ?? ensureGuestSessionId();
    try {
      const res = await getOrCreateMutation.mutateAsync({
        guestSessionId: sid,
        guestName: data.name,
        guestContact: data.contact
      });
      setSenderName(data.name);
      onConversationCreated(res.conversation._id);
    } catch (error) {
      onIdentityError(error);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !conversationId || sending) return;
    const id = `temp-${++tempCounter.current}`;
    setPending(prev => [...prev, {id, body: text, failed: false}]);
    setDraft('');
    try {
      await sendMutation.mutateAsync({body: text});
      setPending(prev =>
        prev.map(p => (p.id === id ? {...p, sent: true} : p))
      );
    } catch {
      setPending(prev =>
        prev.map(p => (p.id === id ? {...p, failed: true} : p))
      );
    }
  };

  const handleRetry = async (id: string) => {
    const item = pending.find(p => p.id === id);
    if (!item || !conversationId || sending) return;
    setPending(prev =>
      prev.map(p => (p.id === id ? {...p, failed: false, sent: false} : p))
    );
    try {
      await sendMutation.mutateAsync({body: item.body});
      setPending(prev =>
        prev.map(p => (p.id === id ? {...p, sent: true} : p))
      );
    } catch {
      setPending(prev =>
        prev.map(p => (p.id === id ? {...p, failed: true} : p))
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!conversationId) {
    if (isGuest) {
      return (
        <GuestIdentityForm
          onSubmit={handleGuestSubmit}
          submitting={getOrCreateMutation.isPending}
        />
      );
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-10 text-sm text-gray-400">
        {creationFailed ? (
          <>
            <p>Couldn&apos;t start the chat.</p>
            <button
              onClick={onRetryStart}
              disabled={getOrCreateMutation.isPending}
              className="rounded-full bg-[#2d4a35] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3a5c44] disabled:opacity-50"
            >
              Retry
            </button>
          </>
        ) : (
          <p>Starting conversation...</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5"
      >
        {messagesQuery.isLoading && allMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading conversation...
          </div>
        ) : allMessages.length === 0 && visiblePending.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No messages yet. Ask us anything!
          </p>
        ) : (
          <>
            {allMessages.map(m => (
              <SupportMessageBubble key={m._id} message={m} />
            ))}
            {visiblePending.map(p => (
              <div key={p.id} className="flex justify-end">
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-[#2d4a35] text-white ${
                    p.failed ? 'opacity-90' : p.sent ? '' : 'opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {p.failed ? (
                      <button
                        onClick={() => handleRetry(p.id)}
                        disabled={sending}
                        className="shrink-0 rounded-full p-0.5 text-[#f08080] hover:bg-[#f08080]/20"
                        aria-label="Retry sending message"
                      >
                        <RotateCw size={12} />
                      </button>
                    ) : !p.sent ? (
                      <Clock size={12} className="shrink-0 opacity-70" />
                    ) : null}
                    {displayName && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#b8d4c0]">
                        {displayName}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{p.body}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-gray-100 p-3">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type your message... (Enter to send)"
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d4a35] text-white transition-colors hover:bg-[#3a5c44] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>
    </div>
  );
}