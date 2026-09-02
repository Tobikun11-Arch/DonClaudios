'use client';

import {useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {toast} from 'sonner';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {
  useAdminOrderMessagesQuery,
  useFollowUpOrdersQuery,
  useSendAdminOrderMessageMutation
} from '@/lib/hooks/orders/useOrderMessage';
import type {FollowUpOrder} from '@/lib/api/orderApi';
import type {NormalizedApiError} from '@/lib/api/types';

function formatStatus(status: string) {
  return status
    .split('_')
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function customerName(order: FollowUpOrder) {
  if (order.guestInfo) {
    return `${order.guestInfo.firstName} ${order.guestInfo.lastName}`.trim();
  }
  return `Customer #${String(order.orderId).slice(-6).toUpperCase()}`;
}

export default function OwnerOrderFollowUp() {
  const {data, isLoading, isError} = useFollowUpOrdersQuery();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const messagesQuery = useAdminOrderMessagesQuery(activeOrderId ?? '', !!activeOrderId);
  const sendMutation = useSendAdminOrderMessageMutation();

  const orders = data?.orders ?? [];

  const activeOrder = orders.find(o => o.orderId === activeOrderId);

  const handleSend = async (text: string) => {
    if (!activeOrderId) return;
    try {
      await sendMutation.mutateAsync({orderId: activeOrderId, body: text});
      toast.success('Reply sent. Customer notified.');
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to send reply.'
      );
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Follow-up</h2>
          <p className="text-sm text-gray-500 mt-1">
            Reply to customers asking about their orders.
          </p>
        </div>
        <OwnerNotificationBell />
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading conversations...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load conversations.
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          No follow-up conversations yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Conversation list */}
          <div className="space-y-3">
            {orders.map(order => (
              <button
                key={order.orderId}
                onClick={() => setActiveOrderId(order.orderId)}
                className={`w-full text-left rounded-2xl bg-white shadow p-4 transition-colors ${
                  activeOrderId === order.orderId
                    ? 'ring-2 ring-[#3c5e45]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gray-900">
                    {customerName(order)}
                  </p>
                  <span className="rounded-full bg-[#3c5e45]/10 px-2.5 py-0.5 text-xs font-bold text-[#3c5e45]">
                    {formatStatus(order.orderStatus)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Order #{String(order.orderId).slice(-6).toUpperCase()} •{' '}
                  {order.orderType}
                </p>
                <p className="mt-2 line-clamp-2 text-xs text-gray-600">
                  <span className="font-semibold">{order.lastSender}:</span>{' '}
                  {order.lastMessage}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                  <MessageCircle size={12} />
                  {order.messageCount} message{order.messageCount > 1 ? 's' : ''} •{' '}
                  {order.lastMessageAt
                    ? new Date(order.lastMessageAt).toLocaleString()
                    : ''}
                </p>
              </button>
            ))}
          </div>

          {/* Active conversation */}
          <div className="rounded-2xl bg-white shadow p-5">
            {activeOrder ? (
              <>
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-900">
                    {customerName(activeOrder)} — Order #
                    {String(activeOrder.orderId).slice(-6).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activeOrder.orderType} • {formatStatus(activeOrder.orderStatus)} •{' '}
                    ₱{activeOrder.totalAmount}.00
                  </p>
                </div>
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
                    placeholder="Reply to the customer..."
                  />
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 py-10 text-center">
                Select a conversation to reply.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
