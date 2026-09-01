'use client';

import {
  createReview,
  listAdminReviews,
  listMyReviews,
  listPublicReviews,
  replyReview,
  replyReviewByCustomer,
  updateReviewStatus
} from '@/lib/api/reviewsApi';
import {adminNotificationsQueryKey} from '@/lib/hooks/notifications/useNotifications';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const publicReviewsQueryKey = ['reviews', 'public'] as const;
export const myReviewsQueryKey = ['reviews', 'my'] as const;
export const adminReviewsQueryKey = ['reviews', 'admin'] as const;

export function usePublicReviewsQuery() {
  return useQuery({
    queryKey: publicReviewsQueryKey,
    queryFn: listPublicReviews,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useMyReviewsQuery() {
  return useQuery({
    queryKey: myReviewsQueryKey,
    queryFn: listMyReviews,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useAdminReviewsQuery() {
  return useQuery({
    queryKey: adminReviewsQueryKey,
    queryFn: listAdminReviews,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
    staleTime: 1000
  });
}

export function useCreateReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: myReviewsQueryKey});
    }
  });
}

export function useUpdateReviewStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateReviewStatus,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: adminReviewsQueryKey});
      await queryClient.invalidateQueries({queryKey: publicReviewsQueryKey});
    }
  });
}

export function useReplyReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replyReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: adminReviewsQueryKey});
      await queryClient.invalidateQueries({queryKey: myReviewsQueryKey});
    }
  });
}

export function useCustomerReplyReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replyReviewByCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: myReviewsQueryKey});
      await queryClient.invalidateQueries({queryKey: adminReviewsQueryKey});
      await queryClient.invalidateQueries({queryKey: adminNotificationsQueryKey});
    }
  });
}
