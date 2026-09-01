'use client';

import {useState} from 'react';
import {cn} from '@/lib/utils';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {ProfileTab} from './ProfileTab';
import {SecurityTab} from './SecurityTab';
import {TeamTab} from './TeamTab';

type TabId = 'profile' | 'security' | 'team';

const TABS: {id: TabId; label: string}[] = [
  {id: 'profile', label: 'Profile & Business Info'},
  {id: 'security', label: 'Security'},
  {id: 'team', label: 'Team'}
];

export function SettingsPage() {
  const [active, setActive] = useState<TabId>('profile');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35]">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your profile, business, security, and team.
          </p>
        </div>
        <OwnerNotificationBell />
      </div>

      <div className="-mx-1 overflow-x-auto scrollbar-hide border-b border-gray-200 px-1 sm:mx-0 sm:px-0">
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

      <div className="mt-6">
        {active === 'profile' && <ProfileTab />}
        {active === 'security' && <SecurityTab />}
        {active === 'team' && <TeamTab />}
      </div>
    </div>
  );
}
