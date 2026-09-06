'use client';

import {useMemo, useState} from 'react';
import {Headset, X} from 'lucide-react';
import OwnerChatThread from './OwnerChatThread';
import {
  useAdminSupportConversationsQuery,
  useCloseSupportConversationMutation
} from '@/lib/hooks/support/useSupport';
import type {NormalizedApiError} from '@/lib/api/types';
import {toast} from 'sonner';

type Filter = 'open' | 'closed';

export default function SupportInbox() {
  const [filter, setFilter] = useState<Filter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversationsQuery = useAdminSupportConversationsQuery(true);
  const closeMutation = useCloseSupportConversationMutation();

  const conversations = conversationsQuery.data?.conversations ?? [];
  const filtered = useMemo(
    () =>
      conversations
        .filter(c => (filter === 'open' ? c.status === 'open' : c.status === 'closed'))
        .sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() -
            new Date(a.lastMessageAt).getTime()
        ),
    [conversations, filter]
  );

  const selected =
    conversations.find(c => c._id === selectedId) ??
    filtered[0] ??
    null;

  const handleSelect = (id: string) => setSelectedId(id);

  const handleClose = async () => {
    if (!selected) return;
    try {
      await closeMutation.mutateAsync(selected._id);
      setSelectedId(null);
      toast.success('Conversation marked as closed.');
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ??
          'Failed to close conversation.'
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Conversation list */}
      <div className="w-full md:w-72 flex flex-col border-r border-gray-200 min-h-0">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-bold text-gray-900">Support Chats</p>
          <div className="mt-2 flex gap-1">
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
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {conversationsQuery.isLoading ? (
            <div className="p-4 text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">
              No {filter} conversations.
            </div>
          ) : (
            filtered.map(c => {
              const active = c._id === selected?._id;
              return (
                <button
                  key={c._id}
                  onClick={() => handleSelect(c._id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${
                    active ? 'bg-[#eef4ef]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`truncate text-sm font-semibold ${
                        active ? 'text-[#2d4a35]' : 'text-gray-900'
                      }`}
                    >
                      {c.displayName || 'Customer'}
                    </span>
                    {c.unreadCount ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
                        {c.unreadCount}
                      </span>
                    ) : filter === 'closed' ? (
                      <span className="truncate text-[11px] font-semibold text-gray-500">
                        {c.closedBy === 'customer'
                          ? 'Closed by customer'
                          : 'Resolved by you'}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400">
                        {new Date(c.lastMessageAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                  {c.contact && (
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {c.contact}
                    </p>
                  )}
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {c.lastMessage || 'No messages'}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className="hidden md:flex flex-1 flex-col min-w-0 min-h-0">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Headset size={18} className="text-[#2d4a35]" />
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {selected.displayName || 'Customer'}
                  </p>
                  {selected.contact && (
                    <p className="text-xs text-gray-400">{selected.contact}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.status === 'open' && (
                  <button
                    onClick={handleClose}
                    disabled={closeMutation.isPending}
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {closeMutation.isPending ? 'Closing...' : 'Mark Resolved'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <OwnerChatThread
                conversationId={selected._id}
                conversationStatus={selected.status}
                closedBy={selected.closedBy ?? null}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Select a conversation to reply
          </div>
        )}
      </div>

      {/* Mobile: full chat replaces list when a conversation is selected */}
      <div className="md:hidden flex-1 min-h-0">
        {selected ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {selected.displayName || 'Customer'}
                </p>
                {selected.contact && (
                  <p className="text-xs text-gray-400">{selected.contact}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-full p-1.5 hover:bg-gray-100"
                aria-label="Back to list"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <OwnerChatThread
                conversationId={selected._id}
                conversationStatus={selected.status}
                closedBy={selected.closedBy ?? null}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  );
}