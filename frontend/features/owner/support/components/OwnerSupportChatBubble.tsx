'use client';

import {useMemo, useState} from 'react';
import Image from 'next/image';
import {ArrowLeft, Check, X} from 'lucide-react';
import {toast} from 'sonner';
import OwnerChatThread from './OwnerChatThread';
import {
  useAdminSupportConversationsQuery,
  useCloseSupportConversationMutation
} from '@/lib/hooks/support/useSupport';
import type {SupportConversation} from '@/lib/api/supportApi';
import {
  supportBubbleClass,
  supportPanelHeightOwnerClass
} from '@/lib/support/supportBubblePosition';
import type {NormalizedApiError} from '@/lib/api/types';

type Filter = 'open' | 'closed';

function ConversationRow({
  conversation,
  active,
  onSelect
}: {
  conversation: SupportConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
        active ? 'bg-[#eef4ef]' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`truncate text-sm font-semibold ${
            active ? 'text-[#2d4a35]' : 'text-gray-900'
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
      {conversation.contact && (
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {conversation.contact}
        </p>
      )}
      <p className="mt-0.5 truncate text-xs text-gray-500">
        {conversation.lastMessage || 'No messages'}
      </p>
    </button>
  );
}

export default function OwnerSupportChatBubble() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [filter, setFilter] = useState<Filter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closeMutation = useCloseSupportConversationMutation();

  const conversationsQuery = useAdminSupportConversationsQuery(true);
  const conversations = useMemo(
    () => conversationsQuery.data?.conversations ?? [],
    [conversationsQuery.data?.conversations]
  );

  const filtered = useMemo(
    () =>
      conversations
        .filter(c =>
          filter === 'open' ? c.status === 'open' : c.status === 'closed'
        )
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
        ),
    [conversations, filter]
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (sum, c) => (c.status === 'open' ? sum + (c.unreadCount ?? 0) : sum),
        0
      ),
    [conversations]
  );

  const openCountLabel = useMemo(
    () => `${conversations.filter(c => c.status === 'open').length} open`,
    [conversations]
  );

  const selected = conversations.find(c => c._id === selectedId) ?? null;
  const unreadBadge = open ? 0 : totalUnread;

  const handleOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setView('list');
    setSelectedId(null);
  };

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
        (error as NormalizedApiError)?.message ??
          'Failed to close conversation.'
      );
    }
  };

  return (
    <div className={supportBubbleClass}>
      {open && (
        <div
          className={`${supportPanelHeightOwnerClass} mb-3 flex w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl`}
        >
          {view === 'list' ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-[#2d4a35] px-4 py-3 text-white">
                <div>
                  <p className="text-sm font-bold leading-tight">
                    Support Chats
                  </p>
                  <p className="text-[11px] text-[#b8d4c0]">
                    {openCountLabel}
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

              <div className="flex shrink-0 gap-1 border-b border-gray-100 px-4 py-2.5">
                {(['open', 'closed'] as Filter[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                      filter === f
                        ? 'bg-[#2d4a35] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {conversationsQuery.isLoading ? (
                  <div className="p-4 text-sm text-gray-400">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400">
                    No {filter} conversations.
                  </div>
                ) : (
                  filtered.map(c => (
                    <ConversationRow
                      key={c._id}
                      conversation={c}
                      active={c._id === selectedId}
                      onSelect={() => handleSelect(c._id)}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-[#2d4a35] px-3 py-3 text-white">
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
                    {selected?.contact || 'No contact'}
                  </p>
                </div>
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
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#2d4a35] text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Open support inbox"
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
      </button>
    </div>
  );
}
