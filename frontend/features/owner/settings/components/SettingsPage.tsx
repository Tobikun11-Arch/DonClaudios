'use client';

import {useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import {FilterSelect} from '@/shared/components/FilterPills';
import {Input} from '@/components/ui/input';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {ProfileTab} from './ProfileTab';
import {SecurityTab} from './SecurityTab';
import {CashierTab} from './CashierTab';
import {StoreStatusTab} from './StoreStatusTab';
import {MenuCategoriesTab} from './MenuCategoriesTab';
import {PaymentTab} from './PaymentTab';
import {
  UserRound,
  Clock,
  Tags,
  Wallet,
  ShieldCheck,
  UsersRound,
  Search
} from 'lucide-react';

type TabId = 'profile' | 'store' | 'categories' | 'payment' | 'security' | 'cashier';

type TabDef = {
  id: TabId;
  label: string;
  subtitle: string;
  icon: typeof UserRound;
  group: number;
};

const TABS: TabDef[] = [
  {id: 'profile', label: 'Profile & Business Info', subtitle: 'Manage your account, business details, and prep times.', icon: UserRound, group: 1},
  {id: 'store', label: 'Store Status', subtitle: 'Opening hours and manual close controls.', icon: Clock, group: 1},
  {id: 'categories', label: 'Menu Categories', subtitle: 'Organize how products are grouped.', icon: Tags, group: 2},
  {id: 'payment', label: 'Payment', subtitle: 'Manual payment channels shown to customers.', icon: Wallet, group: 2},
  {id: 'security', label: 'Security', subtitle: 'Password and active sessions.', icon: ShieldCheck, group: 3},
  {id: 'cashier', label: 'Cashier', subtitle: 'Manage cashier accounts.', icon: UsersRound, group: 3}
];

const GROUPS = [1, 2, 3];

export function SettingsPage() {
  const [active, setActive] = useState<TabId>('profile');
  const [query, setQuery] = useState('');

  const filteredTabs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TABS;
    return TABS.filter(t => t.label.toLowerCase().includes(q));
  }, [query]);

  const activeTab = TABS.find(t => t.id === active)!;

  const renderContent = () => {
    switch (active) {
      case 'profile':
        return <ProfileTab />;
      case 'store':
        return <StoreStatusTab />;
      case 'categories':
        return <MenuCategoriesTab />;
      case 'payment':
        return <PaymentTab />;
      case 'security':
        return <SecurityTab />;
      case 'cashier':
        return <CashierTab />;
    }
  };

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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-full shrink-0 lg:block lg:w-[280px]">
          <div className="sticky top-0 h-screen overflow-y-auto py-2 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search settings"
                className="min-h-[40px] rounded-xl bg-gray-50 pl-9 text-sm"
                aria-label="Search settings"
              />
            </div>

            <nav className="mt-2 space-y-1">
              {GROUPS.map((g, gi) => {
                const items = filteredTabs.filter(t => t.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g}>
                    {gi > 0 && <div className="my-2 border-t border-gray-200" />}
                    <ul className="space-y-0.5">
                      {items.map(tab => {
                        const isActive = active === tab.id;
                        const Icon = tab.icon;
                        return (
                          <li key={tab.id}>
                            <button
                              type="button"
                              onClick={() => setActive(tab.id)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                  ? 'bg-gray-100 font-semibold text-gray-900'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{tab.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
              {filteredTabs.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-400">
                  No matching section.
                </p>
              )}
            </nav>
          </div>
        </aside>

        {/* Mobile selector */}
        <div className="space-y-3 lg:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search settings"
              className="min-h-[40px] rounded-xl bg-gray-50 pl-9 text-sm"
              aria-label="Search settings"
            />
          </div>
          <FilterSelect
            ariaLabel="Settings section"
            value={active}
            onChange={v => setActive(v as TabId)}
            options={filteredTabs.map(tab => ({value: tab.id, label: tab.label}))}
          />
        </div>

        {/* Content panel */}
        <main className="min-w-0 flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{activeTab.label}</h2>
            <p className="mt-1 text-sm text-gray-500">{activeTab.subtitle}</p>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
