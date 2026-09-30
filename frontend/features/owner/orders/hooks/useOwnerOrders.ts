'use client';

import {useCallback, useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {listAllOrders, updateOrderStatus} from '@/lib/api/orderApi';
import type {ListAllOrdersParams} from '@/lib/api/orderApi';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {ALL_STATUSES} from '../components/OrderPills';
import type {OrderHistoryEntry} from '@/lib/api/orderApi';
import type {ReportRange} from '@/lib/types/report';

export const OWNER_ORDERS_PAGE_SIZE = 10;
export const ownerOrdersKey = ['owner', 'orders'] as const;

/**
 * Orders are paginated server-side (`/orders/all?page&limit&status&type`).
 * Status, order type and the date range are resolved by the backend so the
 * page count and revenue stay consistent with the visible rows.
 *
 * Searching is intentionally different: you cannot paginate a text search that
 * runs on fields the server does not index, so when a search term is present we
 * fetch the whole (already status/type/range filtered) set in one page and let
 * the client filter it. Once the search clears we return to bounded pages.
 */
export function useOwnerOrders(range: ReportRange) {
  const queryClient = useQueryClient();
  const filters = useOrderFilters();
  const [page, setPage] = useState(1);

  const searching = filters.search.trim().length > 0;

  // Resets to the first page when a filter or the date range changes. This is a
  // render-time adjustment (React's sanctioned replacement for an effect), so
  // React discards the in-progress render and commits with page 1 + the new
  // params — no cascading fetch, no ref, no effect.
  const filterKey = `${filters.status}|${filters.search}|${range.preset}|${range.from ?? ''}|${range.to ?? ''}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (appliedFilterKey !== filterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

  const params = useMemo<ListAllOrdersParams>(() => {
    const next: ListAllOrdersParams = {
      preset: range.preset,
      withCounts: true
    };
    // `all` is a UI sentinel: the endpoint's status enum has no such member and
    // already treats an absent `status` as "every status".
    if (filters.status !== ALL_STATUSES) {
      next.status = filters.status;
    }
    if (range.preset === 'custom') {
      next.from = range.from;
      next.to = range.to;
    }
    if (!searching) {
      next.page = page;
      next.limit = OWNER_ORDERS_PAGE_SIZE;
    }
    return next;
  }, [filters.status, searching, page, range]);

  const query = useQuery({
    queryKey: ['owner', 'orders', params],
    queryFn: () => listAllOrders(params),
    staleTime: 20_000,
    gcTime: 5 * 60 * 1000,
    // Keep the previous page's rows on screen ("lazy loading") while the next
    // page loads, instead of flashing a skeleton on every navigation.
    placeholderData: data => data
  });

  const orders = useMemo(
    () => filterOrders(query.data?.orders ?? [], filters),
    [query.data?.orders, filters]
  );

  const totalPages = searching ? 1 : Math.max(1, query.data?.totalPages ?? 1);

  // Never strand the user on a page that no longer exists (e.g. a status update
  // elsewhere shrank the results). Same render-time pattern as the filter reset.
  if (!searching && page > totalPages) {
    setPage(totalPages);
  }
  const effectivePage = Math.min(page, totalPages);

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
    filters,
    orders,
    page: effectivePage,
    totalPages,
    total: query.data?.total ?? 0,
    revenue: query.data?.revenue ?? 0,
    statusCounts: query.data?.counts?.status ?? {},
    isSearching: searching,
    setPage,
    isLoading: query.isLoading,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refresh: invalidate,
    updateStatus: statusMutation.mutate,
    isUpdatingStatus: statusMutation.isPending
  };
}

/**
 * Client-side filtering shared by the table and the mobile card list. The
 * backend already narrows by status/type/range, so this mainly applies the text
 * search (which also covers item names and the payment method — fields the
 * order endpoint cannot search cheaply).
 */
export function filterOrders(
  orders: OrderHistoryEntry[],
  filters: {status: string; search: string}
) {
  const needle = filters.search.trim().toLowerCase();
  return orders.filter(order => {
    if (filters.status !== ALL_STATUSES && order.orderStatus !== filters.status) return false;
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
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  return {status, setStatus, search, setSearch};
}