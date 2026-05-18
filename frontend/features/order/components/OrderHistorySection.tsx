'use client';

import Image from 'next/image';
import type {OrderHistoryEntry, OrderHistoryItem} from '@/lib/api/orderApi';

function formatStatus(status: string) {
  return status
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatOrderType(orderType: string) {
  return orderType.charAt(0).toUpperCase() + orderType.slice(1);
}

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

type OrderHistorySectionProps = {
  orders: OrderHistoryEntry[];
  title: string;
  description: string;
  isLoading?: boolean;
  isError?: boolean;
};

export default function OrderHistorySection({
  orders,
  title,
  description,
  isLoading = false,
  isError = false
}: OrderHistorySectionProps) {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 mb-10">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading order history...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load order history.
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order._id} className="rounded-2xl bg-white shadow p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Order #{order._id}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatOrderType(order.orderType)}
                    {order.createdAt ? ` • ${new Date(order.createdAt).toLocaleString()}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#3c5e45]/10 px-3 py-1 text-xs font-bold text-[#3c5e45]">
                    {formatStatus(order.orderStatus)}
                  </span>
                  <span className="text-sm font-extrabold text-gray-900">
                    ₱{order.totalAmount}.00
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {order.items.map((item, index) => {
                  const imageUrl = getItemImage(item);
                  return (
                    <div
                      key={item._id ?? `${order._id}-${index}`}
                      className="flex items-start gap-3 rounded-xl border border-gray-100 p-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-50">
                        <Image
                          src={imageUrl && imageUrl.length > 0 ? imageUrl : '/assets/sample_menu.png'}
                          alt={getItemName(item)}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2">
                          {getItemName(item)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Qty {item.quantity} • ₱{item.price}.00 each
                        </p>
                        {item.specialRequest ? (
                          <p className="text-xs text-gray-500 mt-1">
                            Request: {item.specialRequest}
                          </p>
                        ) : null}
                      </div>

                      <p className="text-sm font-bold text-gray-900">
                        ₱{item.price * item.quantity}.00
                      </p>
                    </div>
                  );
                })}
              </div>

              {order.riderNotes ? (
                <p className="mt-4 text-xs text-gray-500">
                  Notes: {order.riderNotes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
