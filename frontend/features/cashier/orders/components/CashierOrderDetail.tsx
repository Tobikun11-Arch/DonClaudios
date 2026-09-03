'use client';

import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {toast} from 'sonner';
import {ArrowLeft, Package, User, Phone, MapPin} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Modal} from '@/features/owner/cashiers/components/Modal';
import OrderChatThread from '@/features/order/components/OrderChatThread';
import {
  useOrderDetailQuery,
  useUpdateOrderStatusMutation,
  useSendCashierOrderMessageMutation
} from '@/lib/hooks/orders/useCashierOrder';
import {useAdminOrderMessagesQuery} from '@/lib/hooks/orders/useOrderMessage';
import type {OrderHistoryItem, OrderHistoryEntry} from '@/lib/api/orderApi';
import type {NormalizedApiError} from '@/lib/api/types';
import {
  STATUS_FLOW,
  CANCELLABLE,
  formatStatus,
  orderTypeLabel,
  customerDisplay,
  statusChipClass
} from './CashierOrders';

function getItemName(item: OrderHistoryItem) {
  if (item.name) return item.name;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.name ?? 'Product';
  }
  return 'Product';
}

function getItemImage(item: OrderHistoryItem) {
  if (item.imageUrl) return item.imageUrl;
  if (item.productId && typeof item.productId === 'object') {
    return item.productId.imageUrl;
  }
  return undefined;
}

export default function CashierOrderDetail({orderId}: {orderId: string}) {
  const {data, isLoading, isError} = useOrderDetailQuery(orderId);
  const updateStatusMutation = useUpdateOrderStatusMutation();
  const sendMutation = useSendCashierOrderMessageMutation();
  const messagesQuery = useAdminOrderMessagesQuery(orderId, true);
  const [cancelling, setCancelling] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow p-10 text-sm text-gray-500">
        Loading order details...
      </div>
    );
  }

  if (isError || !data?.order) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow p-10 text-sm text-red-600">
        Failed to load this order.
      </div>
    );
  }

  const order: OrderHistoryEntry = data.order;
  const statusIdx = STATUS_FLOW.indexOf(order.orderStatus as never);
  const canAdvance = statusIdx >= 0 && statusIdx < STATUS_FLOW.length - 1;
  const canCancel = CANCELLABLE.includes(order.orderStatus as (typeof CANCELLABLE)[number]);

  const advance = async () => {
    if (statusIdx < 0 || statusIdx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[statusIdx + 1];
    try {
      await updateStatusMutation.mutateAsync({orderId, status: next});
      toast.success(`Order marked as ${formatStatus(next)}.`);
    } catch (error) {
      toast.error((error as NormalizedApiError)?.message ?? 'Failed to update status.');
    }
  };

  const cancel = async () => {
    try {
      await updateStatusMutation.mutateAsync({orderId, status: 'cancelled'});
      toast.success('Order cancelled.');
      setCancelling(false);
    } catch (error) {
      toast.error((error as NormalizedApiError)?.message ?? 'Failed to cancel order.');
    }
  };

  const sendReply = async (text: string) => {
    try {
      await sendMutation.mutateAsync({orderId, body: text});
    } catch (error) {
      toast.error((error as NormalizedApiError)?.message ?? 'Failed to send reply.');
    }
  };

  const isUpdating = updateStatusMutation.isPending;
  const orderNo = String(order._id).slice(-6).toUpperCase();
  const customer = customerDisplay(order);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link
          href="/cashier/dashboard?tab=orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2d4a35] hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Orders
        </Link>
      </div>

      <div className="rounded-2xl bg-white shadow p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{customer}</h2>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusChipClass(order.orderStatus)}`}>
                {formatStatus(order.orderStatus)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Order #{orderNo} • {orderTypeLabel(order.orderType)} • ₱{order.totalAmount}.00
              {order.isGuest && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  GUEST
                </span>
              )}
            </p>
            {order.createdAt && (
              <p className="text-[11px] text-gray-400 mt-0.5">
                Placed {new Date(order.createdAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canAdvance && (
              <button
                onClick={advance}
                disabled={isUpdating}
                className="rounded-xl bg-[#2d4a35] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#3a5c44] disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : `Mark ${formatStatus(STATUS_FLOW[statusIdx + 1])}`}
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setCancelling(true)}
                disabled={isUpdating}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3">
            <User size={16} className="shrink-0 text-[#2d4a35]" />
            <span className="text-sm text-gray-600">
              {order.guestInfo
                ? `${order.guestInfo.phoneNumber || 'No phone'}`
                : order.isGuest
                  ? 'Guest'
                  : 'Registered customer'}
            </span>
          </div>
          {order.guestInfo?.phoneNumber && (
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3">
              <Phone size={16} className="shrink-0 text-[#2d4a35]" />
              <span className="text-sm text-gray-600">{order.guestInfo.phoneNumber}</span>
            </div>
          )}
          {order.guestInfo?.address ? (
            <div className="flex items-center gap-2 rounded-xl border border-gray-100 p-3 sm:col-span-2">
              <MapPin size={16} className="shrink-0 text-[#2d4a35]" />
              <span className="text-sm text-gray-600">{order.guestInfo.address}</span>
            </div>
          ) : null}
        </div>

        {order.riderNotes ? (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Rider / Notes</p>
            <p className="text-sm text-gray-700">{order.riderNotes}</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white shadow p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Order Items</h3>
        <div className="space-y-3">
          {(order.items ?? []).map((item, index) => {
            const imageUrl = getItemImage(item);
            return (
              <div key={item._id ?? `${order._id}-${index}`} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                  <Image
                    src={imageUrl && imageUrl.length > 0 ? imageUrl : '/assets/sample_menu.png'}
                    alt={getItemName(item)}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 line-clamp-2">{getItemName(item)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Qty {item.quantity} • ₱{item.price}.00 each
                  </p>
                  {item.specialRequest ? (
                    <p className="text-xs text-gray-500 mt-1">Request: {item.specialRequest}</p>
                  ) : null}
                </div>
                <p className="text-sm font-bold text-gray-900">₱{item.price * item.quantity}.00</p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <p className="text-sm font-bold text-gray-900">Total</p>
          <p className="text-lg font-extrabold text-[#2d4a35]">₱{order.totalAmount}.00</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white shadow p-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
          Conversation with {customer}
        </p>
        {messagesQuery.isLoading ? (
          <div className="text-sm text-gray-500">Loading conversation...</div>
        ) : messagesQuery.isError ? (
          <div className="text-sm text-red-600">Failed to load conversation.</div>
        ) : (
          <OrderChatThread
            messages={messagesQuery.data?.messages ?? []}
            sending={sendMutation.isPending}
            onSubmit={sendReply}
            placeholder="Reply to the customer..."
            teamOnRight
          />
        )}
      </div>

      <Modal open={cancelling} title="Cancel order" onClose={() => setCancelling(false)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel order{' '}
            <span className="font-bold text-gray-900">#{orderNo}</span> from{' '}
            <span className="font-bold text-gray-900">{customer}</span>? This cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setCancelling(false)} disabled={isUpdating}>
              Keep Order
            </Button>
            <Button type="button" variant="destructive" onClick={cancel} disabled={isUpdating}>
              {isUpdating ? 'Cancelling…' : 'Cancel Order'}
            </Button>
          </div>
        </div>
      </Modal>

      {!canAdvance && (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 text-center flex items-center justify-center gap-2 text-xs text-gray-400">
          <Package size={14} />
          <span>{order.orderStatus === 'cancelled' ? 'This order was cancelled.' : 'This order is completed.'}</span>
        </div>
      )}
    </div>
  );
}