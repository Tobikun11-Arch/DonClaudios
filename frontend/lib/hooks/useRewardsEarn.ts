'use client';

import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  getRewardsEarnSettings,
  updateRewardsEarnSettings
} from '@/lib/api/settingsApi';
import {DEFAULT_REWARDS_EARN_RULE, type RewardsEarnRule} from '@/config/rewards';

export const rewardsEarnQueryKey = ['settings', 'rewards-earn'] as const;

/**
 * Loyalty earn rule (points per pesos). Falls back to the built-in default
 * while loading (or if the request fails). Points themselves are always
 * computed on the server when an order completes.
 */
export function useRewardsEarnQuery() {
  const query = useQuery({
    queryKey: rewardsEarnQueryKey,
    queryFn: getRewardsEarnSettings,
    staleTime: 5 * 60 * 1000
  });
  const rule: RewardsEarnRule = query.data?.rewardsEarn ?? DEFAULT_REWARDS_EARN_RULE;
  const defaults: RewardsEarnRule = query.data?.defaults ?? DEFAULT_REWARDS_EARN_RULE;
  return {...query, rule, defaults};
}

export function useUpdateRewardsEarnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RewardsEarnRule) => updateRewardsEarnSettings(body),
    onSuccess: data => {
      queryClient.setQueryData(rewardsEarnQueryKey, data);
    }
  });
}
