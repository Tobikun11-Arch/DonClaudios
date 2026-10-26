'use client';

import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {useAddCustomerCartItemMutation} from '@/lib/hooks/cart/useCustomerCart';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

function describe(order: OrderHistoryEntry): string {
  const size = order.sizeKg ? `${order.sizeKg} kg lechon` : 'Lechon order';
  const fulfillment = order.orderType === 'delivery' ? 'Delivery' : 'Pickup';
  const addons = order.items
    .slice(1)
    .map(i => i.name ?? (typeof i.productId === 'string' ? '' : i.productId.name))
    .filter(Boolean)
    .join(', ');
  return [size, addons, fulfillment].filter(Boolean).join(' · ');
}

export function UsualOrderCard({
  orders
}: {
  orders: OrderHistoryEntry[];
}) {
  const router = useRouter();
  const addItem = useAddCustomerCartItemMutation();
  const order = orders[0];

  const handleReorder = async () => {
    if (!order) return;
    try {
      for (const item of order.items) {
        const name =
          item.name ??
          (typeof item.productId === 'string'
            ? 'Item'
            : item.productId.name ?? 'Item');
        const productId =
          typeof item.productId === 'string'
            ? item.productId
            : item.productId._id;
        await addItem.mutateAsync({
          productId,
          name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        });
      }
      toast.success('Added to cart.');
      router.push('/customer/dashboard');
    } catch {
      toast.error('Could not add to cart. Try again.');
    }
  };

  if (!order) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Your usual order</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          No orders yet. Once you place one, your go-to lechon setup shows up
          here for one-tap reorder.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-foreground">Your usual order</h2>
      <p className="mt-3 text-sm text-foreground">{describe(order)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(order.createdAt ?? '').toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })}
      </p>
      <button
        type="button"
        onClick={handleReorder}
        disabled={addItem.isPending}
        className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-accent-warm px-4 text-sm font-semibold text-accent-warm-foreground disabled:opacity-60"
      >
        {addItem.isPending ? 'Adding…' : 'Reorder'}
      </button>
    </div>
  );
}
