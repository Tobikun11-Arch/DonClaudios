'use client';

import {useState} from 'react';
import {ChevronDown, MessageCircle} from 'lucide-react';
import {toast} from 'sonner';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import {
  useOrderMessagesQuery,
  useSendOrderMessageMutation
} from '@/lib/hooks/orders/useOrderMessage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {cn} from '@/lib/utils';

const QUICK_QUESTIONS = [
  'When will my order be ready?',
  'Can I change my pick-up / delivery time?',
  'Can I add a note to my order?'
];

/**
 * Two-way follow-up with the store about one order. The cashier (or the
 * owner, for pre-orders) answers from their Orders tab. Works for account
 * customers and for guests (`asGuest`), who follow up from their order page.
 */
export default function CustomerOrderFollowUp({
  order,
  defaultOpen = false,
  asGuest = false,
  variant = 'inline'
}: {
  order: OrderHistoryEntry;
  defaultOpen?: boolean;
  asGuest?: boolean;
  /** `card`: standalone card on the order status page. */
  variant?: 'inline' | 'card';
}) {
  const [open, setOpen] = useState(defaultOpen);
  const messagesQuery = useOrderMessagesQuery(order._id, open, asGuest);
  const sendMutation = useSendOrderMessageMutation();
  const messages = messagesQuery.data?.messages ?? [];

  const handleSend = async (text: string) => {
    try {
      await sendMutation.mutateAsync({orderId: order._id, body: text, asGuest});
    } catch (error) {
      toast.error(getFriendlyErrorMessage(error, 'Failed to send message.'));
    }
  };

  const body = (
    <>
      {messagesQuery.isLoading ? (
        <div className="space-y-2">
          <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : messagesQuery.isError ? (
        <div className="text-sm text-red-600 dark:text-red-300">
          Failed to load conversation.
        </div>
      ) : (
        <>
          {messages.length === 0 ? (
            <div className="mb-3 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No messages yet. Ask us anything about this order — our team
                replies here.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map(q => (
                  <button
                    key={q}
                    type="button"
                    disabled={sendMutation.isPending}
                    onClick={() => handleSend(q)}
                    className="rounded-full border border-[#3c5e45]/30 bg-white px-3 py-1 text-xs font-medium text-[#2d4a35] transition-colors hover:bg-[#e9f5ee] disabled:opacity-50 dark:border-[#7ed4a0]/30 dark:bg-gray-900 dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <OrderChatThread
            messages={messages}
            sending={sendMutation.isPending}
            onSubmit={handleSend}
            placeholder="Ask about your order, e.g. when will it be ready?"
          />
        </>
      )}
    </>
  );

  if (variant === 'card') {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e9f5ee] text-[#2d4a35] dark:bg-[#7ed4a0]/10 dark:text-[#7ed4a0]">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">
              Message the store
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Questions or changes about this order? Chat with DonClaudio&apos;s.
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-gray-400 transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
        {open ? (
          <div className="border-t border-gray-100 p-4 sm:p-5 dark:border-gray-800">{body}</div>
        ) : null}
      </section>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-[#2d4a35] hover:bg-[#e9f5ee] dark:border-gray-700 dark:text-[#7ed4a0] dark:hover:bg-[#7ed4a0]/10"
      >
        <MessageCircle size={16} />
        {open ? 'Hide follow-up' : 'Follow up on this order'}
      </button>
      {open ? (
        <div className="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">{body}</div>
      ) : null}
    </div>
  );
}
