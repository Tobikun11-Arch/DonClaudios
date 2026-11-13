'use client';

import {
  createReview,
  getReviewEligibility,
  listAdminReviews,
  listMyReviews,
  listPublicReviews,
  replyReview,
  replyReviewByCustomer,
  updateReviewStatus
} from '@/lib/api/reviewsApi';
import {adminNotificationsQueryKey} from '@/lib/hooks/notifications/useNotifications';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {SAFETY_REFETCH_MS, useRefetchOnChange} from '@/lib/hooks/sync/useRefetchOnChange';

export const publicReviewsQueryKey = ['reviews', 'public'] as const;
export const myReviewsQueryKey = ['reviews', 'my'] as const;
export const adminReviewsQueryKey = ['reviews', 'admin'] as const;
export const reviewEligibilityQueryKey = ['reviews', 'eligibility'] as const;

export function usePublicReviewsQuery() {
  return useQuery({
    queryKey: publicReviewsQueryKey,
    queryFn: listPublicReviews,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
}

export function useMyReviewsQuery() {
  useRefetchOnChange('reviews', myReviewsQueryKey);
  return useQuery({
    queryKey: myReviewsQueryKey,
    queryFn: listMyReviews,
    refetchOnWindowFocus: false,
    refetchInterval: SAFETY_REFETCH_MS,
    staleTime: 1000
  });
}

export function useAdminReviewsQuery() {
  useRefetchOnChange('reviews', adminReviewsQueryKey);
  return useQuery({
    queryKey: adminReviewsQueryKey,
    queryFn: listAdminReviews,
    refetchOnWindowFocus: false,
    refetchInterval: SAFETY_REFETCH_MS,
    staleTime: 1000
  });
}

export function useReviewEligibilityQuery() {
  useRefetchOnChange('orders', reviewEligibilityQueryKey);
  useRefetchOnChange('reviews', reviewEligibilityQueryKey);
  return useQuery({
    queryKey: reviewEligibilityQueryKey,
    queryFn: getReviewEligibility,
    refetchOnWindowFocus: false,
    refetchInterval: SAFETY_REFETCH_MS,
    staleTime: 1000
  });
}

export function useCreateReviewMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: myReviewsQueryKey});
      await queryClient.invalidateQueries({
        queryKey: reviewEligibilityQueryKey
      });
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
