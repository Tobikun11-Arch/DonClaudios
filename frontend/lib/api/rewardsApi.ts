import {httpClient} from './httpClient';

export type RewardProduct = {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  description?: string;
  pointsRequired: number;
};

export type RewardRedemption = {
  _id: string;
  productId: string;
  productName: string;
  productImage?: string;
  pointsSpent: number;
  quantity: number;
  redeemCode?: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  createdAt: string;
};

export type GetRewardsResponse = {
  points: number;
  products: RewardProduct[];
  redemptions: RewardRedemption[];
};

export type RedeemRewardResponse = {
  redemption: RewardRedemption;
  remainingPoints: number;
};

export async function getRewards() {
  const res = await httpClient.get<GetRewardsResponse>('/rewards');
  return res.data;
}

export async function redeemReward(productId: string, quantity?: number) {
  const res = await httpClient.post<RedeemRewardResponse>('/rewards/redeem', {
    productId,
    quantity
  });
  return res.data;
}
