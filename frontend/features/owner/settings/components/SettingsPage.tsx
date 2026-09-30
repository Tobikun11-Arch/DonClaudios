'use client';

import {useState} from 'react';
import {cn} from '@/lib/utils';
import {FilterSelect} from '@/shared/components/FilterPills';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {ProfileTab} from './ProfileTab';
import {SecurityTab} from './SecurityTab';
import {CashierTab} from './CashierTab';
import {StoreStatusTab} from './StoreStatusTab';
import {MenuCategoriesTab} from './MenuCategoriesTab';

type TabId = 'profile' | 'store' | 'categories' | 'security' | 'cashier';

const TABS: {id: TabId; label: string}[] = [
  {id: 'profile', label: 'Profile & Business Info'},
  {id: 'store', label: 'Store Status'},
  {id: 'categories', label: 'Menu Categories'},
  {id: 'security', label: 'Security'},
  {id: 'cashier', label: 'Cashier'}
];

export function SettingsPage() {
  const [active, setActive] = useState<TabId>('profile');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your profile, business, security, and cashier.
          </p>
        </div>
        <OwnerNotificationBell />
      </div>

      {/*
        Below `sm` the five tab labels overflow a phone, and the row scrolled
        sideways behind a hidden scrollbar — invisible but scrollable. Swap in
        the shared dropdown there and keep the underline tabs from `sm` up.
      */}
      <div className="hidden overflow-x-auto border-b border-gray-200 sm:block">
        <div className="flex min-w-max gap-6">
          {TABS.map(tab => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={cn(
                  'relative shrink-0 pb-3 text-sm font-semibold transition-colors -mb-px',
                  isActive
                    ? 'text-[#2d4a35]'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#2d4a35]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <FilterSelect
        className="sm:hidden"
        ariaLabel="Settings section"
        value={active}
        onChange={v => setActive(v as TabId)}
        options={TABS.map(tab => ({value: tab.id, label: tab.label}))}
      />

      <div className="mt-6">
        {active === 'profile' && <ProfileTab />}
        {active === 'store' && <StoreStatusTab />}
        {active === 'categories' && <MenuCategoriesTab />}
        {active === 'security' && <SecurityTab />}
        {active === 'cashier' && <CashierTab />}
      </div>
    </div>
  );
}
