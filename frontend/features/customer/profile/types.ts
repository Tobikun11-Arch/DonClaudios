import type {
  CustomerAddress,
  CustomerOccasion,
  CustomerPreferences
} from '@/lib/api/authApi';

export type {CustomerAddress, CustomerOccasion, CustomerPreferences};

export type ProfileSummary = {
  firstName: string;
  orderCount: number;
  memberSince: string | null;
  lastOrderLabel: string | null;
};
