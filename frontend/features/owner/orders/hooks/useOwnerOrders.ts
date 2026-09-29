'use client';

import {useCallback, useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {listAllOrders, updateOrderStatus} from '@/lib/api/orderApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import type {ReportRange} from '@/lib/types/report';

export const ownerOrdersKey = ['owner', 'orders'] as const;

/** Today in Manila as `YYYY-MM-DD`; order `createdAt` is bucketed the same way. */
function manilaDayKey(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(iso));
}

function isWithinRange(createdAt: string | undefined, range: ReportRange) {
  if (!createdAt) return false;
  if (range.preset !== 'custom') return true;
  const key = manilaDayKey(createdAt);
  if (range.from && key < range.from) return false;
  if (range.to && key > range.to) return false;
  return true;
}

export function useOwnerOrders(range: ReportRange) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ownerOrdersKey,
    queryFn: listAllOrders,
    staleTime: 20_000,
    gcTime: 5 * 60 * 1000
  });

  // Client-side narrowing keeps the list instant and avoids a second request;
  // `/orders/all` is already scoped to the owner and returns the full history.
  const orders = useMemo(() => {
    const all = query.data?.orders ?? [];
    return all.filter(order => isWithinRange(order.createdAt, range));
  }, [query.data?.orders, range]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({queryKey: ownerOrdersKey});
  }, [queryClient]);

  const statusMutation = useMutation({
    mutationFn: ({orderId, status}: {orderId: string; status: string}) =>
      updateOrderStatus(orderId, status),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(`Order moved to ${variables.status.replace(/_/g, ' ')}`);
    },
    onError: (error, variables) => {
      toast.error(
        getFriendlyErrorMessage(error, `Failed to set order to ${variables.status}`)
      );
    }
  });

  return {
    orders,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refresh: invalidate,
    updateStatus: statusMutation.mutate,
    isUpdatingStatus: statusMutation.isPending
  };
}

/** Search helper shared by the table and the mobile card list. */
export function filterOrders(
  orders: OrderHistoryEntry[],
  filters: {status: string; type: string; search: string}
) {
  const needle = filters.search.trim().toLowerCase();
  return orders.filter(order => {
    if (filters.status !== 'all' && order.orderStatus !== filters.status) return false;
    if (filters.type !== 'all' && order.orderType !== filters.type) return false;
    if (!needle) return true;

    const customer = order.customerName ?? [
      order.guestInfo?.firstName,
      order.guestInfo?.lastName
    ]
      .filter(Boolean)
      .join(' ');
    const haystack = [
      order._id,
      customer,
      order.guestInfo?.phoneNumber,
      order.paymentMethod,
      ...(order.items ?? []).map(item => itemName(item))
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function itemName(item: OrderHistoryEntry['items'][number]) {
  return typeof item.productId === 'string' ? '' : (item.productId?.name ?? '');
}

export function orderCustomerName(order: OrderHistoryEntry) {
  if (order.customerName) return order.customerName;
  if (order.guestInfo) {
    return [order.guestInfo.firstName, order.guestInfo.lastName].filter(Boolean).join(' ');
  }
  return 'Guest';
}

export function useOrderFilters() {
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  return {status, setStatus, type, setType, search, setSearch};
}
