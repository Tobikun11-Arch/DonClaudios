'use client';

import {useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import {FilterSelect} from '@/shared/components/FilterPills';
import {Input} from '@/components/ui/input';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {ProfileTab} from './ProfileTab';
import {CustomizeTab} from './CustomizeTab';
import {SecurityTab} from './SecurityTab';
import {CashierTab} from './CashierTab';
import {StoreStatusTab} from './StoreStatusTab';
import {MenuCategoriesTab} from './MenuCategoriesTab';
import {PaymentTab} from './PaymentTab';
import AppearancePreview from '@/features/owner/appearance/components/AppearancePreview';
import {
  UserRound,
  Clock,
  Tags,
  Wallet,
  ShieldCheck,
  UsersRound,
  Palette,
  Sun,
  Home,
  ChevronDown,
  Search
} from 'lucide-react';

type TabId =
  | 'profile'
  | 'appearanceCustomize'
  | 'appearanceHomepage'
  | 'store'
  | 'categories'
  | 'payment'
  | 'security'
  | 'cashier';

type TopItem = {
  id: string;
  label: string;
  icon: typeof UserRound;
  group: number;
  hasChildren?: boolean;
};

const TOP_ITEMS: TopItem[] = [
  {id: 'profile', label: 'Profile & Business Info', icon: UserRound, group: 1},
  {id: 'appearance', label: 'Appearance', icon: Palette, group: 1, hasChildren: true},
  {id: 'store', label: 'Store Status', icon: Clock, group: 1},
  {id: 'categories', label: 'Menu Categories', icon: Tags, group: 2},
  {id: 'payment', label: 'Payment', icon: Wallet, group: 2},
  {id: 'security', label: 'Security', icon: ShieldCheck, group: 3},
  {id: 'cashier', label: 'Cashier', icon: UsersRound, group: 3}
];

const APPEARANCE_CHILDREN: {id: TabId; label: string; icon: typeof Sun}[] = [
  {id: 'appearanceCustomize', label: 'Customize', icon: Sun},
  {id: 'appearanceHomepage', label: 'Homepage', icon: Home}
];

const TAB_INFO: Record<TabId, {label: string; subtitle: string}> = {
  profile: {label: 'Profile & Business Info', subtitle: 'Manage your account, business details, and prep times.'},
  appearanceCustomize: {label: 'Customize', subtitle: 'Light and dark mode.'},
  appearanceHomepage: {label: 'Homepage', subtitle: 'Customize storefront content, colors, and layout.'},
  store: {label: 'Store Status', subtitle: 'Opening hours and manual close controls.'},
  categories: {label: 'Menu Categories', subtitle: 'Organize how products are grouped.'},
  payment: {label: 'Payment', subtitle: 'Manual payment channels shown to customers.'},
  security: {label: 'Security', subtitle: 'Password and active sessions.'},
  cashier: {label: 'Cashier', subtitle: 'Manage cashier accounts.'}
};

const GROUPS = [1, 2, 3];

export function SettingsPage() {
  const [active, setActive] = useState<TabId>('profile');
  const [query, setQuery] = useState('');
  const [appearanceOpen, setAppearanceOpen] = useState(true);

  const isAppearanceActive = active === 'appearanceCustomize' || active === 'appearanceHomepage';

  // Auto-expand appearance when a child is active or search matches children
  const filteredTop = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOP_ITEMS;
    return TOP_ITEMS.filter(item => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.hasChildren) {
        return APPEARANCE_CHILDREN.some(c => c.label.toLowerCase().includes(q));
      }
      return false;
    });
  }, [query]);

  const filteredChildren = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APPEARANCE_CHILDREN;
    return APPEARANCE_CHILDREN.filter(c => c.label.toLowerCase().includes(q));
  }, [query]);

  // Force open when searching
  const openAppearance = appearanceOpen || query.trim().length > 0;

  const activeInfo = TAB_INFO[active];

  const renderContent = () => {
    switch (active) {
      case 'appearanceCustomize':
        return <CustomizeTab />;
      case 'appearanceHomepage':
        return <AppearancePreview />;
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

  // Mobile flat options
  const mobileOptions = useMemo(() => {
    const opts: {value: string; label: string}[] = [];
    for (const item of filteredTop) {
      if (item.hasChildren) {
        for (const c of filteredChildren) {
          opts.push({value: c.id, label: `Appearance › ${c.label}`});
        }
      } else {
        opts.push({value: item.id, label: item.label});
      }
    }
    // include non-appearance top items already added; ensure profile/store etc present when not filtered
    return opts;
  }, [filteredTop, filteredChildren]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2d4a35] dark:text-[#7ed4a0]">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search settings"
                className="min-h-[40px] rounded-xl bg-gray-50 dark:bg-gray-800 pl-9 text-sm"
                aria-label="Search settings"
              />
            </div>

            <nav className="mt-2 space-y-1">
              {GROUPS.map((g, gi) => {
                const items = filteredTop.filter(t => t.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g}>
                    {gi > 0 && <div className="my-2 border-t border-gray-200 dark:border-gray-700" />}
                    <ul className="space-y-0.5">
                      {items.map(item => {
                        const Icon = item.icon;
                        const isParentActive = item.hasChildren && isAppearanceActive;
                        if (item.hasChildren) {
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() => setAppearanceOpen(o => !o)}
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                  isParentActive
                                    ? 'bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 hover:text-gray-900 dark:text-gray-100'
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                                <ChevronDown
                                  className={cn(
                                    'ml-auto h-4 w-4 shrink-0 transition-transform',
                                    openAppearance && 'rotate-180'
                                  )}
                                />
                              </button>
                              {openAppearance && (
                                <ul className="mt-0.5 space-y-0.5">
                                  {filteredChildren.map(child => {
                                    const ChildIcon = child.icon;
                                    const childActive = active === child.id;
                                    return (
                                      <li key={child.id}>
                                        <button
                                          type="button"
                                          onClick={() => setActive(child.id as TabId)}
                                          className={cn(
                                            'flex w-full items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-sm transition-colors',
                                            childActive
                                              ? 'bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100'
                                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 hover:text-gray-900 dark:text-gray-100'
                                          )}
                                        >
                                          <ChildIcon className="h-4 w-4 shrink-0" />
                                          <span className="truncate">{child.label}</span>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        }
                        const isActive = active === item.id;
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => setActive(item.id as TabId)}
                              className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive
                                  ? 'bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-800 hover:text-gray-900 dark:text-gray-100'
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile selector */}
        <div className="space-y-3 lg:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search settings"
              className="min-h-[40px] rounded-xl bg-gray-50 dark:bg-gray-800 pl-9 text-sm"
              aria-label="Search settings"
            />
          </div>
          <FilterSelect
            ariaLabel="Settings section"
            value={active}
            onChange={v => setActive(v as TabId)}
            options={mobileOptions.map(o => ({value: o.value, label: o.label}))}
          />
        </div>

        {/* Content panel */}
        <main className="min-w-0 flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activeInfo.label}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{activeInfo.subtitle}</p>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
