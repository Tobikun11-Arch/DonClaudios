'use client';

import {toast} from 'sonner';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
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

  // One toast per action, shown only after the server confirms the save.
  // Silent saves (typing in an address) pass no message. Errors share one
  // toast id so fast typing cannot stack error toasts.
  const save = (patch: Parameters<typeof updateProfileMutation.mutate>[0], successMessage?: string) => {
    updateProfileMutation.mutate(patch, {
      onSuccess: () => {
        // Fixed id: rapid saves (e.g. typing a number) update one toast
        // instead of stacking many.
        if (successMessage) toast.success(successMessage, {id: 'profile-save-success'});
      },
      onError: err =>
        toast.error(getFriendlyErrorMessage(err, 'Failed to save your changes.'), {
          id: 'profile-save-error'
        })
    });
  };
  const saveAddresses = (next: typeof addresses, msg?: string) => save({addresses: next}, msg);
  const saveOccasions = (next: typeof occasions, msg?: string) => save({occasions: next}, msg);
  const savePreferences = (next: typeof preferences, msg?: string) => save({preferences: next}, msg);

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
