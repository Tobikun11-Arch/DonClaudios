'use client';

import {useState} from 'react';
import {MessageCircle, X} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import {
  useOrderMessagesQuery,
  useSendOrderMessageMutation
} from '@/lib/hooks/orders/useOrderMessage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import type {NormalizedApiError} from '@/lib/api/types';

export default function CustomerOrderFollowUp({
  order,
  defaultOpen = false
}: {
  order: OrderHistoryEntry;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const messagesQuery = useOrderMessagesQuery(order._id, open);
  const sendMutation = useSendOrderMessageMutation();

  const handleSend = async (text: string) => {
    try {
      await sendMutation.mutateAsync({orderId: order._id, body: text});
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to send message.'
      );
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <Button
        onClick={() => setOpen(prev => !prev)}
        variant="outline"
        size="sm"
        className="gap-2 text-[#2d4a35]"
      >
        {open ? <X size={16} /> : <MessageCircle size={16} />}
        {open ? 'Close Follow Up' : 'Follow Up on this Order'}
      </Button>

      {open && (
        <div className="mt-4 rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            Conversation with DonClaudio&apos;s
          </p>
          {messagesQuery.isLoading ? (
            <div className="text-sm text-gray-500">Loading conversation...</div>
          ) : messagesQuery.isError ? (
            <div className="text-sm text-red-600">
              Failed to load conversation.
            </div>
          ) : (
            <OrderChatThread
              messages={messagesQuery.data?.messages ?? []}
              sending={sendMutation.isPending}
              onSubmit={handleSend}
              placeholder="Ask about your order, e.g. when will it be ready?"
            />
          )}
        </div>
      )}
    </div>
  );
}
