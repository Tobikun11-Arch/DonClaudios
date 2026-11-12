'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Image from 'next/image';
import {ArrowLeft, Check, CheckCheck, X} from 'lucide-react';
import {toast} from 'sonner';
import OwnerChatThread from './OwnerChatThread';
import ExpandingSearch from './ExpandingSearch';
import {
  useAdminSupportConversationsQuery,
  useAdminSupportInquiriesQuery,
  useAdminSupportQueueStatsQuery,
  useCloseSupportConversationMutation,
  useMarkSupportAnsweredMutation
} from '@/lib/hooks/support/useSupport';
import type {SupportConversation, SupportInquiry} from '@/lib/api/supportApi';
import {
  supportBubbleClass,
  supportPanelHeightOwnerClass
} from '@/lib/support/supportBubblePosition';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {useChatSoundOnIncrease} from '@/lib/hooks/support/useChatSound';
import {
  formatMinutes,
  formatWait,
  inquiryChipClass,
  inquiryLabel
} from '@/lib/support/inquiry';

/**
 * Owner support inbox, organised as an INQUIRY QUEUE:
 *  - Queue:    open conversations with unanswered inquiries, URGENT first,
 *              then whoever has waited longest.
 *  - Answered: open conversations where every inquiry has a reply.
 *  - Closed:   resolved conversations.
 *  - Log:      every customer message logged as an inquiry with its type,
 *              priority, status and response time.
 */
type Tab = 'queue' | 'answered' | 'closed' | 'log';

const TABS: {id: Tab; label: string}[] = [
  {id: 'queue', label: 'Queue'},
  {id: 'answered', label: 'Answered'},
  {id: 'closed', label: 'Closed'},
  {id: 'log', label: 'Log'}
];

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function ConversationRow({
  conversation,
  active,
  now,
  onSelect
}: {
  conversation: SupportConversation;
  active: boolean;
  now: number;
  onSelect: () => void;
}) {
  const isPending = conversation.inquiryStatus === 'pending';
  const isUrgent = isPending && conversation.priority === 'urgent';
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700 transition-colors ${
        isUrgent ? 'border-l-4 border-l-red-500 bg-red-50/60 dark:bg-red-500/10' : ''
      } ${
        active ? 'bg-[#eef4ef] dark:bg-[#7ed4a0]/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`truncate text-sm font-semibold ${
            active ? 'text-[#2d4a35] dark:text-[#7ed4a0]' : 'text-gray-900 dark:text-gray-100'
          }`}
        >
          {conversation.displayName || 'Customer'}
        </span>
        {conversation.unreadCount ? (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
            {conversation.unreadCount}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] text-gray-400">
            {new Date(conversation.lastMessageAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-1">
        {isUrgent && (
          <span className="rounded-full bg-red-600 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">
            Urgent
          </span>
        )}
        <span
          className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${inquiryChipClass(
            conversation.category
          )}`}
        >
          {inquiryLabel(conversation.category)}
        </span>
        {isPending && conversation.status === 'closed' && (
          <span className="text-[10px] font-semibold text-gray-500">
            chat closed by customer ·
          </span>
        )}
        {isPending ? (
          <span
            className={`text-[10px] font-semibold ${
              isUrgent ? 'text-red-600 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {conversation.pendingCount ?? 1} pending
            {conversation.pendingSince
              ? ` · waiting ${formatWait(conversation.pendingSince, now)}`
              : ''}
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#4a7c59] dark:text-[#7ed4a0]">
            <CheckCheck size={11} /> Answered
          </span>
        )}
      </div>

      {conversation.contact && (
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {conversation.contact}
        </p>
      )}
      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
        {conversation.lastMessage || 'No messages'}
      </p>
    </button>
  );
}

function InquiryLogRow({
  inquiry,
  now,
  onOpen
}: {
  inquiry: SupportInquiry;
  now: number;
  onOpen: () => void;
}) {
  const pending = inquiry.inquiryStatus === 'pending';
  const urgent = inquiry.priority === 'urgent';
  return (
    <button
      onClick={onOpen}
      className={`w-full text-left px-4 py-2.5 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
        urgent && pending ? 'border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">
          {inquiry.senderName}
          <span className="ml-1 font-normal text-gray-400">
            ({inquiry.customerType})
          </span>
        </span>
        <span
          className={`shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase ${
            pending
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
              : inquiry.inquiryStatus === 'customer_closed'
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                : 'bg-[#eef4ef] text-[#2d4a35] dark:bg-[#7ed4a0]/15 dark:text-[#7ed4a0]'
          }`}
        >
          {inquiry.inquiryStatus === 'customer_closed'
            ? 'closed by customer'
            : inquiry.inquiryStatus}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
        {inquiry.body}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-gray-400">
        {urgent && (
          <span className="rounded-full bg-red-600 px-1.5 py-px text-[9px] font-bold uppercase text-white">
            Urgent{inquiry.autoFlagged ? ' (auto)' : ''}
          </span>
        )}
        <span
          className={`rounded-full border px-1.5 py-px text-[9px] font-semibold ${inquiryChipClass(
            inquiry.category
          )}`}
        >
          {inquiryLabel(inquiry.category)}
        </span>
        <span>
          {new Date(inquiry.createdAt).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}
        </span>
        <span className="ml-auto">
          {pending
            ? `waiting ${formatWait(inquiry.createdAt, now)}`
            : inquiry.inquiryStatus === 'customer_closed'
              ? 'no staff reply needed'
              : inquiry.responseMinutes != null
                ? `replied in ${formatMinutes(inquiry.responseMinutes)}`
                : 'marked answered'}
        </span>
      </div>
    </button>
  );
}

export default function OwnerSupportChatBubble() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [tab, setTab] = useState<Tab>('queue');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Search on Answered / Closed / Log (the Queue stays a short, ordered list).
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchable = tab !== 'queue';
  const query = searchable ? search.trim().toLowerCase() : '';
  const closeMutation = useCloseSupportConversationMutation();
  const answeredMutation = useMarkSupportAnsweredMutation();
  const now = useNow();

  const conversationsQuery = useAdminSupportConversationsQuery(true);
  const statsQuery = useAdminSupportQueueStatsQuery(true);
  const inquiriesQuery = useAdminSupportInquiriesQuery(
    undefined,
    open && tab === 'log'
  );
  const stats = statsQuery.data?.stats;

  const conversations = useMemo(
    () => conversationsQuery.data?.conversations ?? [],
    [conversationsQuery.data?.conversations]
  );

  const filtered = useMemo(() => {
    const byRecent = (a: SupportConversation, b: SupportConversation) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();

    if (tab === 'queue') {
      // Urgent first, then the one that has waited the longest.
      return conversations
        .filter(c => c.inquiryStatus === 'pending')
        .sort((a, b) => {
          const au = a.priority === 'urgent' ? 0 : 1;
          const bu = b.priority === 'urgent' ? 0 : 1;
          if (au !== bu) return au - bu;
          return (
            new Date(a.pendingSince ?? a.lastMessageAt).getTime() -
            new Date(b.pendingSince ?? b.lastMessageAt).getTime()
          );
        });
    }
    const matches = (c: SupportConversation) =>
      !query ||
      [c.displayName, c.contact, c.lastMessage].some(v =>
        (v ?? '').toLowerCase().includes(query)
      );
    if (tab === 'answered') {
      return conversations
        .filter(c => c.status === 'open' && c.inquiryStatus !== 'pending')
        .filter(matches)
        .sort(byRecent);
    }
    return conversations
      .filter(c => c.status === 'closed' && c.inquiryStatus !== 'pending')
      .filter(matches)
      .sort(byRecent);
  }, [conversations, tab, query]);

  const logRows = useMemo(() => {
    const rows = inquiriesQuery.data?.inquiries ?? [];
    if (!query) return rows;
    return rows.filter(i =>
      [i.senderName, i.body].some(v => (v ?? '').toLowerCase().includes(query))
    );
  }, [inquiriesQuery.data?.inquiries, query]);

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (sum, c) => (c.status === 'open' ? sum + (c.unreadCount ?? 0) : sum),
        0
      ),
    [conversations]
  );
  const queueCount = useMemo(
    () =>
      conversations.filter(c => c.inquiryStatus === 'pending').length,
    [conversations]
  );
  const urgentWaiting = useMemo(
    () =>
      conversations.filter(
        c => c.inquiryStatus === 'pending' && c.priority === 'urgent'
      ).length,
    [conversations]
  );

  // Urgent first so its double pop wins when both change in the same poll.
  useChatSoundOnIncrease(urgentWaiting, true);
  useChatSoundOnIncrease(totalUnread);

  const selected = conversations.find(c => c._id === selectedId) ?? null;
  const unreadBadge = open ? 0 : totalUnread;

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setView('list');
    setSelectedId(null);
  };

  // Click / tap outside the panel (and its bubble) closes it, like the
  // customer chat. Toasts are ignored so dismissing one keeps it open.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || rootRef.current?.contains(target)) return;
      if (target.closest('[data-sonner-toaster]')) return;
      setOpen(false);
      setView('list');
      setSelectedId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setView('thread');
  };

  const handleBack = () => {
    setView('list');
    setSelectedId(null);
  };

  const handleCloseConversation = async () => {
    if (!selected) return;
    try {
      await closeMutation.mutateAsync(selected._id);
      toast.success('Conversation marked as closed.');
      handleBack();
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to close conversation.')
      );
    }
  };

  const handleMarkAnswered = async () => {
    if (!selected) return;
    try {
      await answeredMutation.mutateAsync(selected._id);
      toast.success('Inquiry marked as answered.');
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Failed to update inquiry.'));
    }
  };

  return (
    <div ref={rootRef} className={supportBubbleClass}>
      {open && (
        <div
          className={`${supportPanelHeightOwnerClass} mb-3 flex w-[calc(100vw-2.5rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl`}
        >
          {view === 'list' ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-[#2d4a35] px-4 py-3 text-white">
                <div>
                  <p className="text-sm font-bold leading-tight">
                    Inquiry Queue
                  </p>
                  <p className="text-[11px] text-[#b8d4c0]">
                    {queueCount} waiting
                    {urgentWaiting > 0 ? ` · ${urgentWaiting} urgent` : ''}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="rounded-full p-1.5 text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white transition-colors"
                  aria-label="Close support chat"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Queue stats (last 7 days) */}
              <div className="grid shrink-0 grid-cols-3 gap-px border-b border-gray-100 bg-gray-100 text-center dark:border-gray-700 dark:bg-gray-700">
                <div className="bg-white px-2 py-2 dark:bg-gray-900">
                  <p
                    className={`text-base font-bold ${
                      (stats?.urgentPending ?? 0) > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {stats?.urgentPending ?? 0}
                  </p>
                  <p className="text-[10px] text-gray-500">Urgent pending</p>
                </div>
                <div className="bg-white px-2 py-2 dark:bg-gray-900">
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {stats?.pending ?? 0}
                  </p>
                  <p className="text-[10px] text-gray-500">Total pending</p>
                </div>
                <div
                  className="bg-white px-2 py-2 dark:bg-gray-900"
                  title={`Urgent: ${formatMinutes(stats?.avgUrgentResponseMinutes)} · Normal: ${formatMinutes(stats?.avgNormalResponseMinutes)}`}
                >
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                    {formatMinutes(stats?.avgResponseMinutes)}
                  </p>
                  <p className="text-[10px] text-gray-500">Avg reply (7d)</p>
                </div>
              </div>

              <div className="relative flex shrink-0 gap-1 border-b border-gray-100 dark:border-gray-700 py-2.5 pl-4 pr-12">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      if (t.id === 'queue') {
                        setSearchOpen(false);
                        setSearch('');
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      tab === t.id
                        ? 'bg-[#2d4a35] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t.label}
                    {t.id === 'queue' && queueCount > 0 ? ` (${queueCount})` : ''}
                  </button>
                ))}
                {searchable && (
                  <ExpandingSearch
                    open={searchOpen}
                    value={search}
                    onOpenChange={setSearchOpen}
                    onChange={setSearch}
                    placeholder={
                      tab === 'log'
                        ? 'Search name or message...'
                        : 'Search name, contact or message...'
                    }
                  />
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === 'log' ? (
                  inquiriesQuery.isLoading ? (
                    <div className="p-4 text-sm text-gray-400">Loading...</div>
                  ) : logRows.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400">
                      {query
                        ? `No inquiries match "${search.trim()}".`
                        : 'No inquiries logged yet.'}
                    </div>
                  ) : (
                    logRows.map(i => (
                      <InquiryLogRow
                        key={i._id}
                        inquiry={i}
                        now={now}
                        onOpen={() => handleSelect(String(i.conversationId))}
                      />
                    ))
                  )
                ) : conversationsQuery.isLoading ? (
                  <div className="p-4 text-sm text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">
                    {tab === 'queue'
                      ? 'All caught up. No inquiries waiting.'
                      : query
                        ? `No ${tab} conversations match "${search.trim()}".`
                        : `No ${tab} conversations.`}
                  </div>
                ) : (
                  filtered.map(c => (
                    <ConversationRow
                      key={c._id}
                      conversation={c}
                      now={now}
                      active={c._id === selectedId}
                      onSelect={() => handleSelect(c._id)}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 dark:border-gray-700 bg-[#2d4a35] px-3 py-3 text-white">
                <button
                  onClick={handleBack}
                  className="rounded-full p-1.5 text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white transition-colors"
                  aria-label="Back to conversation list"
                >
                  <ArrowLeft size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight">
                    {selected?.displayName || 'Customer'}
                  </p>
                  <p className="truncate text-[11px] text-[#b8d4c0]">
                    {selected?.inquiryStatus === 'pending'
                      ? `${selected.priority === 'urgent' ? 'URGENT · ' : ''}${inquiryLabel(selected.category)} · pending`
                      : selected?.contact || 'No contact'}
                  </p>
                </div>
                {selected?.inquiryStatus === 'pending' && (
                  <button
                    onClick={handleMarkAnswered}
                    disabled={answeredMutation.isPending}
                    title="Mark as answered without replying in chat (e.g. you called them)"
                    className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25 disabled:opacity-50"
                  >
                    <CheckCheck size={12} />
                    {answeredMutation.isPending ? '...' : 'Answered'}
                  </button>
                )}
                {selected?.status === 'open' && (
                  <button
                    onClick={handleCloseConversation}
                    disabled={closeMutation.isPending}
                    className="flex shrink-0 items-center gap-1 rounded-full bg-[#4a7c59] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#3a5c44] disabled:opacity-50"
                  >
                    <Check size={12} />
                    {closeMutation.isPending ? 'Closing...' : 'Resolve'}
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="shrink-0 rounded-full p-1.5 text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white transition-colors"
                  aria-label="Close support chat"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {selected ? (
                  <OwnerChatThread
                    conversationId={selected._id}
                    conversationStatus={selected.status}
                    closedBy={selected.closedBy ?? null}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    This conversation is no longer available.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => (open ? handleClose() : handleOpen())}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2d4a35] text-white shadow-lg transition-transform hover:scale-105 ${
          !open && urgentWaiting > 0 ? 'ring-4 ring-red-500 animate-pulse' : ''
        }`}
        aria-label={
          urgentWaiting > 0
            ? `Open support inbox, ${urgentWaiting} urgent inquiries waiting`
            : 'Open support inbox'
        }
      >
        <Image
          src={open ? '/assets/no_support.png' : '/assets/don_support.png'}
          alt={open ? 'Close support inbox' : 'Support inbox'}
          width={56}
          height={56}
          className="h-full w-full rounded-full object-cover"
          priority
        />
        {unreadBadge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
            {unreadBadge}
          </span>
        )}
        {!open && urgentWaiting > 0 && (
          <span className="absolute -bottom-1 -left-1 rounded-full bg-red-600 px-1.5 py-px text-[9px] font-bold uppercase text-white">
            Urgent
          </span>
        )}
      </button>
    </div>
  );
}
