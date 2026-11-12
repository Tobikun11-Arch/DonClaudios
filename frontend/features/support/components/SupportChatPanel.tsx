'use client';

import {useEffect, useRef, useState} from 'react';
import {Send, Loader2, Clock, RotateCw, HelpCircle, ChevronDown} from 'lucide-react';
import SupportMessageBubble from './SupportMessageBubble';
import {
  INQUIRY_CATEGORIES,
  INQUIRY_META,
  type InquiryCategory
} from '@/lib/support/inquiry';
import {SUPPORT_FAQS} from '@/lib/support/faq';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {useChatSoundOnNewIds} from '@/lib/hooks/support/useChatSound';

/** Server rejections that retrying unchanged will not fix. */
const BLOCKED_CODES = new Set([
  'PROFANITY_DETECTED',
  'SUPPORT_LINK_BLOCKED',
  'SUPPORT_DUPLICATE_MESSAGE',
  'SUPPORT_RATE_LIMIT',
  'VALIDATION_ERROR'
]);

/** Common questions with instant answers (no waiting in the queue). */
function FaqList({
  openId,
  onToggle,
  onAsk
}: {
  openId: string | null;
  onToggle: (id: string) => void;
  onAsk: (category: InquiryCategory) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Quick answers
      </p>
      {SUPPORT_FAQS.map(f => {
        const open = openId === f.id;
        return (
          <div
            key={f.id}
            className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60"
          >
            <button
              onClick={() => onToggle(f.id)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-800 dark:text-gray-100"
              aria-expanded={open}
            >
              {f.question}
              <ChevronDown
                size={14}
                className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-700">
                <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                  {f.answer}
                </p>
                <button
                  onClick={() => onAsk(f.category)}
                  className="mt-1.5 text-[11px] font-semibold text-[#2d4a35] underline-offset-2 hover:underline dark:text-[#7ed4a0]"
                >
                  Still need help? Message us
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
import GuestIdentityForm from './GuestIdentityForm';
import {
  useCustomerCloseSupportConversationMutation,
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
  category?: InquiryCategory;
};

export default function SupportChatPanel({
  conversationId,
  isGuest,
  guestSessionId,
  viewerName,
  conversationStatus,
  closedBy,
  creationFailed,
  onRetryStart,
  onConversationCreated,
  onIdentityError
}: {
  conversationId: string | null;
  isGuest: boolean;
  guestSessionId: string | null;
  viewerName?: string | null;
  conversationStatus?: 'open' | 'closed';
  closedBy?: 'owner' | 'customer' | null;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const displayName = senderName ?? viewerName ?? null;
  // Inquiry type the customer picks before sending (logged with the message).
  // What the customer picked in this visit (null = use today's default).
  const [pickedCategory, setCategory] = useState<InquiryCategory | null>(null);
  const [categoryHint, setCategoryHint] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const [sendError, setSendError] = useState<string | null>(null);

  const askFromFaq = (c: InquiryCategory) => {
    setCategory(c);
    setCategoryHint(false);
    setShowFaq(false);
    setOpenFaqId(null);
    inputRef.current?.focus();
  };

  const getOrCreateMutation = useGetOrCreateSupportConversationMutation();
  const sendMutation = useSendSupportMessageMutation(
    conversationId ?? '',
    guestSessionIdState
  );
  const closeMutation = useCustomerCloseSupportConversationMutation(
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

  // Default message type = the type of the customer's latest message TODAY,
  // so they don't have to pick again after reopening or refreshing the chat.
  // Urgent is not carried over (a later "thank you" must not jump the queue);
  // it falls back to General. A new day starts with no default.
  const todaysDefaultCategory = (() => {
    const today = new Date().toDateString();
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const m = allMessages[i];
      if (m.senderType !== 'customer' || !m.category) continue;
      if (new Date(m.createdAt).toDateString() !== today) return null;
      return m.category === 'urgent' ? 'general' : m.category;
    }
    return null;
  })();
  const category: InquiryCategory | null =
    pickedCategory ?? todaysDefaultCategory;

  const sending = sendMutation.isPending;
  // Pop for new store replies only (not your own messages or auto-replies).
  useChatSoundOnNewIds(
    allMessages.filter(m => m.senderType === 'owner').map(m => m._id)
  );
  const hasUrgentPending = allMessages.some(
    m =>
      m.senderType === 'customer' &&
      m.inquiryStatus === 'pending' &&
      m.priority === 'urgent'
  );
  const confirmedBodies = new Set(allMessages.map(m => m.body));
  const visiblePending = pending.filter(
    p => p.failed || !confirmedBodies.has(p.body)
  );

  const handleGuestSubmit = async (data: {
    name: string;
    contact: string;
    website: string;
  }) => {
    const sid = guestSessionIdState ?? ensureGuestSessionId();
    try {
      const res = await getOrCreateMutation.mutateAsync({
        guestSessionId: sid,
        guestName: data.name,
        guestContact: data.contact,
        website: data.website
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
    if (!category) {
      setCategoryHint(true);
      return;
    }
    const id = `temp-${++tempCounter.current}`;
    setPending(prev => [...prev, {id, body: text, failed: false, category}]);
    setDraft('');
    setShowFaq(false);
    setSendError(null);
    try {
      await sendMutation.mutateAsync({body: text, category});
      setPending(prev =>
        prev.map(p => (p.id === id ? {...p, sent: true} : p))
      );
    } catch (error) {
      handleSendError(id, text, error);
    }
  };

  /**
   * Messages the spam guard rejects (bad words, links, duplicates, too fast)
   * are removed and explained; the text goes back in the box so the customer
   * can edit it. Network failures keep the retry button.
   */
  const handleSendError = (id: string, text: string, error: unknown) => {
    const code = (error as {code?: string} | null)?.code;
    setSendError(getFriendlyErrorMessage(error, 'Message not sent. Please try again.'));
    if (code && BLOCKED_CODES.has(code)) {
      setPending(prev => prev.filter(p => p.id !== id));
      if (code !== 'SUPPORT_DUPLICATE_MESSAGE') setDraft(text);
      return;
    }
    setPending(prev =>
      prev.map(p => (p.id === id ? {...p, failed: true} : p))
    );
  };

  const handleRetry = async (id: string) => {
    const item = pending.find(p => p.id === id);
    if (!item || !conversationId || sending) return;
    setPending(prev =>
      prev.map(p => (p.id === id ? {...p, failed: false, sent: false} : p))
    );
    try {
      await sendMutation.mutateAsync({
        body: item.body,
        category: item.category ?? category ?? 'general'
      });
      setPending(prev =>
        prev.map(p => (p.id === id ? {...p, sent: true} : p))
      );
      setSendError(null);
    } catch (error) {
      handleSendError(id, item.body, error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCloseChat = async () => {
    if (!conversationId || closeMutation.isPending) return;
    try {
      await closeMutation.mutateAsync();
    } catch {
      // Ignore; the next poll will reconcile the real status.
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
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center dark:text-gray-400">
              Hi! Check the quick answers below, or pick a message type and
              send us a message. Urgent concerns go to the top of our queue.
            </p>
            <FaqList
              openId={openFaqId}
              onToggle={id => setOpenFaqId(cur => (cur === id ? null : id))}
              onAsk={askFromFaq}
            />
          </div>
        ) : showFaq ? (
          <FaqList
            openId={openFaqId}
            onToggle={id => setOpenFaqId(cur => (cur === id ? null : id))}
            onAsk={askFromFaq}
          />
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

      {conversationStatus === 'closed' ? (
        <div className="border-t border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {closedBy === 'customer'
            ? hasUrgentPending
              ? 'You closed this chat. Your urgent message is still in our queue and our staff will still get back to you.'
              : 'You closed this chat.'
            : "DonClaudio's marked this conversation as resolved."}{' '}
          Send a message to reopen.
        </div>
      ) : (
        <div className="flex justify-between border-t border-gray-100 px-3 py-1.5 dark:border-gray-700">
          <button
            onClick={() => setShowFaq(v => !v)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-[#2d4a35] dark:hover:bg-gray-800 dark:hover:text-[#7ed4a0]"
          >
            <HelpCircle size={12} />
            {showFaq ? 'Back to chat' : 'FAQs'}
          </button>
          <button
            onClick={handleCloseChat}
            disabled={closeMutation.isPending || allMessages.length === 0}
            title="Close this chat if you no longer need help"
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-gray-400 transition-colors hover:bg-gray-100 hover:text-[#2d4a35] disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-[#7ed4a0]"
          >
            {closeMutation.isPending ? 'Closing...' : "I'm all set"}
          </button>
        </div>
      )}

      <div className="border-t border-gray-100 px-3 pt-2 dark:border-gray-700">
        <p
          className={`text-[11px] font-semibold ${
            categoryHint && !category
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {categoryHint && !category
            ? 'Please choose what your message is about first:'
            : 'What is this about?'}
        </p>
        {/* Wraps instead of scrolling sideways: a scroll container clips the
            selected chip's ring and shows a scrollbar. */}
        <div className="mt-1 flex flex-wrap gap-1.5 p-0.5">
          {INQUIRY_CATEGORIES.map(c => {
            const meta = INQUIRY_META[c];
            const active = category === c;
            return (
              <button
                key={c}
                type="button"
                title={meta.hint}
                onClick={() => {
                  setCategory(c);
                  setCategoryHint(false);
                }}
                aria-pressed={active}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  active
                    ? `${meta.chip} ring-2 ring-offset-1 ring-[#6b8a6e] dark:ring-offset-gray-900`
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
        </div>
        {category && (
          <p className="text-[10px] text-gray-400">{INQUIRY_META[category].hint}</p>
        )}
        {sendError && (
          <p
            role="alert"
            className="mt-1 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-700 dark:bg-red-500/10 dark:text-red-300"
          >
            {sendError}
          </p>
        )}
      </div>

      <div className="flex items-end gap-2 p-3 pt-2">
        <textarea
          ref={inputRef}
          maxLength={1000}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            conversationStatus === 'closed'
              ? 'Send a message to reopen...'
              : 'Type your message... (Enter to send)'
          }
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8a6e] dark:border-gray-700 dark:text-gray-100 dark:bg-gray-800"
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