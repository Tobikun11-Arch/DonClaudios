'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {getRewards, redeemReward} from '@/lib/api/rewardsApi';

export const rewardsQueryKey = ['rewards'] as const;

export function useRewardsQuery() {
  return useQuery({
    queryKey: rewardsQueryKey,
    queryFn: getRewards,
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });
}

export function useRedeemRewardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({productId, quantity}: {productId: string; quantity?: number}) =>
      redeemReward(productId, quantity),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: rewardsQueryKey});
    }
  });
}
