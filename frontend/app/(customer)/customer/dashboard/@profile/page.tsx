'use client';

import {toast} from 'sonner';
import {useRouter} from 'next/navigation';
import {LogOut} from 'lucide-react';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {ProfileHeader, UsualOrderCard, AddressList, OccasionsCard, PreferencesForm, PromosCard, AccountSection, AppearanceCard, useCustomerProfileData} from '@/features/customer/profile';

export default function ProfileSlot() {
  const {
    user,
    orders,
    promos,
    meQuery,
    updateProfileMutation
  } = useCustomerProfileData();
  const router = useRouter();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/sign-in');
  };

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
        <AppearanceCard />
        <PromosCard promos={promos} />
      </div>
      {/*
        Phones have no sidebar, so this is their only way to log out. Desktop
        keeps the sidebar's Logout and hides this one.
      */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-500/10"
        >
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </div>
  );
}
