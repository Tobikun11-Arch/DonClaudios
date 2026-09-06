'use client';

import {useEffect, useRef, useState} from 'react';
import {Send, Loader2, Clock, RotateCw} from 'lucide-react';
import SupportMessageBubble from '@/features/support/components/SupportMessageBubble';
import {
  useAdminSupportMessagesQuery,
  useSendAdminSupportMessageMutation
} from '@/lib/hooks/support/useSupport';

type PendingItem = {
  id: string;
  body: string;
  failed: boolean;
  sent?: boolean;
};

export default function OwnerChatThread({
  conversationId,
  conversationStatus,
  closedBy
}: {
  conversationId: string;
  conversationStatus?: 'open' | 'closed';
  closedBy?: 'owner' | 'customer' | null;
}) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<PendingItem[]>([]);
  const tempCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useAdminSupportMessagesQuery(conversationId, true);
  const sendMutation = useSendAdminSupportMessageMutation(conversationId);

  const messages = messagesQuery.data?.messages ?? [];
  const sending = sendMutation.isPending;
  const confirmedBodies = new Set(messages.map(m => m.body));
  const visiblePending = pending.filter(
    p => p.failed || !confirmedBodies.has(p.body)
  );

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, pending, sending]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
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
    if (!item || sending) return;
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

  return (
    <div className="flex h-full flex-col min-h-0">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5"
      >
        {messagesQuery.isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Loading conversation...
          </div>
        ) : (
          <>
            {messages.map(m => (
              <SupportMessageBubble key={m._id} message={m} flip />
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
                        aria-label="Retry sending reply"
                      >
                        <RotateCw size={12} />
                      </button>
                    ) : !p.sent ? (
                      <Clock size={12} className="shrink-0 opacity-70" />
                    ) : null}
                    <span className="text-[10px] font-bold uppercase tracking-wide text-[#b8d4c0]">
                      DonClaudio&apos;s
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{p.body}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {conversationStatus === 'closed' && (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-700">
          {closedBy === 'customer'
            ? 'Closed by the customer. Replying will reopen this conversation.'
            : 'This conversation is resolved. Replying will reopen it.'}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-gray-100 p-3">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type your reply... (Enter to send)"
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e]"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d4a35] text-white transition-colors hover:bg-[#3a5c44] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send reply"
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