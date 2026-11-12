'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, ArrowLeft, CheckCheck, X} from 'lucide-react';
import OwnerChatThread from '@/features/owner/support/components/OwnerChatThread';
import {useCashierUrgentSupportQuery} from '@/lib/hooks/support/useSupport';
import {useChatSoundOnIncrease} from '@/lib/hooks/support/useChatSound';
import {supportBubbleClass, supportPanelHeightOwnerClass} from '@/lib/support/supportBubblePosition';
import {formatWait, inquiryLabel} from '@/lib/support/inquiry';
import type {SupportConversation} from '@/lib/api/supportApi';

/**
 * Cashier view of the support chat, limited to URGENT inquiries (wrong or
 * missing items, late orders, allergies...) from the last 24 hours, so the
 * person at the counter can respond fast. All other inquiries stay with the
 * owner. The button only appears while there is an urgent chat to show.
 */
export default function CashierUrgentSupportBubble() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);

  const query = useCashierUrgentSupportQuery(true);
  const conversations = useMemo(
    () => query.data?.conversations ?? [],
    [query.data?.conversations]
  );

  // Still waiting first (longest wait on top), then recently answered.
  const sorted = useMemo(() => {
    const waiting = (c: SupportConversation) => c.inquiryStatus === 'pending';
    return [...conversations].sort((a, b) => {
      if (waiting(a) !== waiting(b)) return waiting(a) ? -1 : 1;
      if (waiting(a)) {
        return (
          new Date(a.pendingSince ?? a.lastMessageAt).getTime() -
          new Date(b.pendingSince ?? b.lastMessageAt).getTime()
        );
      }
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });
  }, [conversations]);

  const waitingCount = useMemo(
    () => conversations.filter(c => c.inquiryStatus === 'pending').length,
    [conversations]
  );

  // Double pop whenever a new urgent inquiry starts waiting.
  useChatSoundOnIncrease(waitingCount, true);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, [open]);

  // Click / tap outside closes the panel (toasts ignored).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || rootRef.current?.contains(target)) return;
      if (target.closest('[data-sonner-toaster]')) return;
      setOpen(false);
      setSelectedId(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const selected = conversations.find(c => c._id === selectedId) ?? null;

  if (!open && conversations.length === 0) return null;

  const close = () => {
    setOpen(false);
    setSelectedId(null);
  };

  return (
    <div ref={rootRef} className={supportBubbleClass}>
      {open && (
        <div
          className={`${supportPanelHeightOwnerClass} mb-3 flex w-[calc(100vw-2.5rem)] max-w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900`}
        >
          <div className="flex shrink-0 items-center gap-2 bg-red-600 px-3 py-3 text-white">
            {selected && (
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-full p-1.5 text-red-100 hover:bg-red-700 hover:text-white"
                aria-label="Back to urgent chats"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0 flex-1 pl-1">
              <p className="truncate text-sm font-bold leading-tight">
                {selected ? selected.displayName || 'Customer' : 'Urgent customer chats'}
              </p>
              <p className="truncate text-[11px] text-red-100">
                {selected
                  ? `${inquiryLabel(selected.category)}${selected.contact ? ` · ${selected.contact}` : ''}`
                  : `${waitingCount} waiting · last 24 hours`}
              </p>
            </div>
            <button
              onClick={close}
              className="rounded-full p-1.5 text-red-100 hover:bg-red-700 hover:text-white"
              aria-label="Close urgent chats"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {selected ? (
              <OwnerChatThread
                role="cashier"
                conversationId={selected._id}
                conversationStatus={selected.status}
                closedBy={selected.closedBy ?? null}
              />
            ) : sorted.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">
                No urgent chats right now.
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <p className="border-b border-gray-100 bg-red-50 px-4 py-2 text-[11px] text-red-700 dark:border-gray-700 dark:bg-red-500/10 dark:text-red-300">
                  Only urgent concerns appear here. Other customer chats are
                  handled by the owner.
                </p>
                {sorted.map(c => {
                  const waiting = c.inquiryStatus === 'pending';
                  return (
                    <button
                      key={c._id}
                      onClick={() => setSelectedId(c._id)}
                      className={`w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/60 ${
                        waiting ? 'border-l-4 border-l-red-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {c.displayName || 'Customer'}
                        </span>
                        {waiting ? (
                          <span className="shrink-0 text-[11px] font-semibold text-red-600 dark:text-red-300">
                            waiting {c.pendingSince ? formatWait(c.pendingSince, now) : ''}
                          </span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-[#4a7c59] dark:text-[#7ed4a0]">
                            <CheckCheck size={12} /> Answered
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {c.lastMessage || 'No messages'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => (open ? close() : setOpen(true))}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 ${
          !open && waitingCount > 0 ? 'animate-pulse ring-4 ring-red-300' : ''
        }`}
        aria-label={
          open
            ? 'Close urgent chats'
            : `Open urgent customer chats, ${waitingCount} waiting`
        }
      >
        {open ? <X size={22} /> : <AlertTriangle size={24} />}
        {!open && waitingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-red-600 shadow">
            {waitingCount}
          </span>
        )}
      </button>
    </div>
  );
}
