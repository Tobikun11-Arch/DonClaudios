'use client';

import {ProfileHeader, UsualOrderCard, AddressList, OccasionsCard, PreferencesForm, PromosCard, AccountSection, useCustomerProfileData} from '@/features/customer/profile';

export default function ProfileSlot() {
  const {
    user,
    orders,
    promos,
    meQuery,
    updateProfileMutation
  } = useCustomerProfileData();

  if (meQuery.isLoading && !user) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const addresses = user?.addresses ?? [];
  const occasions = user?.occasions ?? [];
  const preferences = user?.preferences ?? {};

  const saveAddresses = (next: typeof addresses) => {
    updateProfileMutation.mutate({addresses: next});
  };
  const saveOccasions = (next: typeof occasions) => {
    updateProfileMutation.mutate({occasions: next});
  };
  const savePreferences = (next: typeof preferences) => {
    updateProfileMutation.mutate({preferences: next});
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <ProfileHeader user={user} orders={orders} />
        <AddressList addresses={addresses} onSave={saveAddresses} />
        <AccountSection user={user} />
      </div>
      <div className="space-y-6">
        <OccasionsCard
          occasions={occasions}
          orders={orders}
          onSave={saveOccasions}
        />
        <UsualOrderCard orders={orders} />
        <PreferencesForm preferences={preferences} onSave={savePreferences} />
        <PromosCard promos={promos} />
      </div>
    </div>
  );
}
