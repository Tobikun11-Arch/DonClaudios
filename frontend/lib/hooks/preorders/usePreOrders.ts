'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getOrderById, updateOrderStatus} from '@/lib/api/orderApi';
import {SAFETY_REFETCH_MS, useRefetchOnChange} from '@/lib/hooks/sync/useRefetchOnChange';
import {
  createPreOrderEvent,
  deletePreOrderEvent,
  duplicatePreOrderEvent,
  getOpenPreOrder,
  listOpenPreOrders,
  listPreOrderEventOrders,
  listPreOrderEvents,
  placePreOrder,
  setPreOrderEventStatus,
  updatePreOrderEvent,
  type PlacePreOrderInput,
  type PreOrderEventInput,
  type PreOrderStatus
} from '@/lib/api/preOrderApi';

export const preOrderKeys = {
  owner: ['preorders', 'owner'] as const,
  ownerOrders: (id: string) => ['preorders', 'owner', id, 'orders'] as const,
  order: (orderId: string) => ['preorders', 'order', orderId] as const,
  open: ['preorders', 'open'] as const,
  openOne: (id: string) => ['preorders', 'open', id] as const
};

/**
 * Retry once for network/server hiccups, never for 4xx: a missing route or a
 * closed date will not fix itself, and three backoff retries made the page
 * spin for several seconds before showing anything.
 */
function retryServerErrors(failureCount: number, error: unknown) {
  const status = (error as {status?: number | null} | null)?.status ?? null;
  if (status !== null && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

// ----- owner -----
export function useOwnerPreOrders() {
  return useQuery({queryKey: preOrderKeys.owner, queryFn: listPreOrderEvents, retry: retryServerErrors});
}

/** Owner and cashier: the orders of one date. Refetches when orders change. */
export function useOwnerPreOrderOrders(id: string | null) {
  useRefetchOnChange('orders', preOrderKeys.ownerOrders(id ?? ''), !!id);
  return useQuery({
    queryKey: preOrderKeys.ownerOrders(id ?? ''),
    queryFn: () => listPreOrderEventOrders(id as string),
    enabled: !!id,
    retry: retryServerErrors,
    refetchInterval: SAFETY_REFETCH_MS
  });
}

/** Full order (items, payment, timeline) for the detail drawer. */
export function usePreOrderDetail(orderId: string | null) {
  useRefetchOnChange('orders', preOrderKeys.order(orderId ?? ''), !!orderId);
  return useQuery({
    queryKey: preOrderKeys.order(orderId ?? ''),
    queryFn: async () => (await getOrderById(orderId as string)).order,
    enabled: !!orderId,
    retry: retryServerErrors
  });
}

/** Move a pre-order to its next status (owner or cashier). */
export function useUpdatePreOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({orderId, status}: {orderId: string; status: string}) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      void qc.invalidateQueries({queryKey: ['preorders']});
      void qc.invalidateQueries({queryKey: ['owner', 'orders']});
    }
  });
}

function useInvalidateOwner() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({queryKey: ['preorders']});
}

export function useSavePreOrderEvent() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: ({id, input}: {id?: string; input: PreOrderEventInput}) =>
      id ? updatePreOrderEvent(id, input) : createPreOrderEvent(input),
    onSuccess: invalidate
  });
}

export function useSetPreOrderStatus() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: ({id, status}: {id: string; status: PreOrderStatus}) => setPreOrderEventStatus(id, status),
    onSuccess: invalidate
  });
}

export function useDuplicatePreOrder() {
  const invalidate = useInvalidateOwner();
  return useMutation({
    mutationFn: ({id, title, pickupDate}: {id: string; title: string; pickupDate: string}) =>
      duplicatePreOrderEvent(id, {title, pickupDate}),
    onSuccess: invalidate
  });
}

export function useDeletePreOrder() {
  const invalidate = useInvalidateOwner();
  return useMutation({mutationFn: (id: string) => deletePreOrderEvent(id), onSuccess: invalidate});
}

// ----- customers -----
export function useOpenPreOrders() {
  return useQuery({
    queryKey: preOrderKeys.open,
    queryFn: listOpenPreOrders,
    staleTime: 15000,
    retry: retryServerErrors
  });
}

export function useOpenPreOrder(id: string) {
  return useQuery({
    queryKey: preOrderKeys.openOne(id),
    queryFn: () => getOpenPreOrder(id),
    enabled: !!id,
    retry: retryServerErrors,
    // Remaining counts change as others order: keep them fresh.
    refetchInterval: 20000
  });
}

export function usePlacePreOrder(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PlacePreOrderInput) => placePreOrder(id, input),
    onSettled: () => {
      void qc.invalidateQueries({queryKey: ['preorders']});
      void qc.invalidateQueries({queryKey: ['orders', 'me']});
    }
  });
}
