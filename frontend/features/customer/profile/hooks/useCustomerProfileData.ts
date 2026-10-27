'use client';

import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {
  useUpdateProfileMutation
} from '@/lib/hooks/auth/useProfile';
import {useMyOrdersQuery} from '@/lib/hooks/orders/useCustomerOrder';
import {usePublicPromosQuery} from '@/lib/hooks/promos/usePromos';
import {useRewardsQuery} from '@/lib/hooks/rewards/useRewards';

export function useCustomerProfileData() {
  const meQuery = useMeQuery();
  const ordersQuery = useMyOrdersQuery();
  const promosQuery = usePublicPromosQuery();
  const rewardsQuery = useRewardsQuery();
  const updateProfileMutation = useUpdateProfileMutation();

  const user = meQuery.data?.user;
  const orders = ordersQuery.data?.orders ?? [];
  const promos = (promosQuery.data?.promos ?? []).filter(p => {
    const now = new Date();
    return p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now;
  });

  return {
    user,
    orders,
    promos,
    rewards: rewardsQuery.data,
    meQuery,
    ordersQuery,
    promosQuery,
    rewardsQuery,
    updateProfileMutation
  };
}
