'use client';

import Image from 'next/image';
import {useBrand} from '@/lib/hooks/useBrand';
import type {MeUser} from '@/lib/api/authApi';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';

function memberSinceLabel(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-PH', {month: 'long', year: 'numeric'});
}

function lastOrderLabel(orders: OrderHistoryEntry[]): string | null {
  if (orders.length === 0) return null;
  const o = orders[0];
  const size = o.sizeKg ? `${o.sizeKg} kg` : null;
  const firstItem = o.items?.[0]?.name ?? o.items?.[0]?.productId;
  const itemName = typeof firstItem === 'string' ? firstItem : firstItem?.name;
  const parts = [size, itemName].filter(Boolean).join(' ');
  const tail = parts || `₱${o.totalAmount.toLocaleString()}`;
  return `last: ${tail}`;
}

export function ProfileHeader({
  user,
  orders
}: {
  user: MeUser | undefined;
  orders: OrderHistoryEntry[];
}) {
  const brand = useBrand();
  const firstName = user?.firstName ?? 'ka-suki';
  const since = memberSinceLabel(user?.createdAt);
  const orderCount = orders.length;
  const last = lastOrderLabel(orders);

  const summaryParts: string[] = [];
  if (since) summaryParts.push(`Ka-suki since ${since}`);
  summaryParts.push(`${orderCount} ${orderCount === 1 ? 'order' : 'orders'}`);
  if (last) summaryParts.push(last);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {user?.profilePhoto ? (
          <Image
            src={user.profilePhoto}
            alt="Profile photo"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <Image
            src={brand.logo}
            alt="Don Claudio's Lechon House"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-contain bg-muted p-2"
          />
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground">
            Kumusta, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {summaryParts.join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
}
