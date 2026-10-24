'use client';

import {useCallback, useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import {FilterSelect} from '@/shared/components/FilterPills';
import {Input} from '@/components/ui/input';
import OwnerNotificationBell from '@/features/owner/notifications/components/OwnerNotificationBell';
import {ProfileTab} from './ProfileTab';
import {CustomizeTab} from './CustomizeTab';
import {NotificationsTab} from './NotificationsTab';
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
  Bell,
  Calendar,
  Archive,
  Users,
  BarChart3,
  ChevronDown,
  Search
} from 'lucide-react';

type TabId =
  | 'profile'
  | 'appearanceCustomize'
  | 'appearanceHomepage'
  | 'notificationsPreorders'
  | 'notificationsInventory'
  | 'notificationsCustomers'
  | 'notificationsReports'
  | 'notificationsAccount'
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
  {id: 'notifications', label: 'Notifications', icon: Bell, group: 1, hasChildren: true},
  {id: 'cashier', label: 'Cashier', icon: UsersRound, group: 1},
  {id: 'store', label: 'Store Status', icon: Clock, group: 1},
  {id: 'categories', label: 'Menu Categories', icon: Tags, group: 1},
  {id: 'payment', label: 'Payment', icon: Wallet, group: 1},
  {id: 'security', label: 'Security', icon: ShieldCheck, group: 1}
];

const CHILDREN: Record<string, {id: TabId; label: string; icon: typeof Sun}[]> = {
  appearance: [
    {id: 'appearanceCustomize', label: 'Customize', icon: Sun},
    {id: 'appearanceHomepage', label: 'Homepage', icon: Home}
  ],
  notifications: [
    {id: 'notificationsPreorders', label: 'Pre-orders', icon: Calendar},
    {id: 'notificationsInventory', label: 'Inventory', icon: Archive},
    {id: 'notificationsCustomers', label: 'Customers', icon: Users},
    {id: 'notificationsReports', label: 'Reports', icon: BarChart3},
    {id: 'notificationsAccount', label: 'Account', icon: ShieldCheck}
  ]
};

const TAB_INFO: Record<TabId, {label: string; subtitle: string}> = {
  profile: {label: 'Profile & Business Info', subtitle: 'Manage your account, business details, and prep times.'},
  appearanceCustomize: {label: 'Customize', subtitle: 'Light and dark mode.'},
  appearanceHomepage: {label: 'Homepage', subtitle: 'Customize storefront content, colors, and layout.'},
  notificationsPreorders: {label: 'Pre-orders', subtitle: 'Pre-order batch notifications.'},
  notificationsInventory: {label: 'Inventory', subtitle: 'Stock and inventory notifications.'},
  notificationsCustomers: {label: 'Customers', subtitle: 'Customer and review notifications.'},
  notificationsReports: {label: 'Reports', subtitle: 'Reports and performance notifications.'},
  notificationsAccount: {label: 'Account', subtitle: 'Account security notifications.'},
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
  const [openParents, setOpenParents] = useState<Record<string, boolean>>({
    appearance: false,
    notifications: false
  });


  const filteredTop = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOP_ITEMS;
    return TOP_ITEMS.filter(item => {
      if (item.label.toLowerCase().includes(q)) return true;
      if (item.hasChildren) {
        return (CHILDREN[item.id] || []).some(c => c.label.toLowerCase().includes(q));
      }
      return false;
    });
  }, [query]);

  const filteredChildren = useCallback((parent: string) => {
    const q = query.trim().toLowerCase();
    const kids = CHILDREN[parent] || [];
    if (!q) return kids;
    return kids.filter(c => c.label.toLowerCase().includes(q));
  }, [query]);

  const openParent = (parent: string) =>
    openParents[parent] || query.trim().length > 0;

  const activeInfo = TAB_INFO[active];

  const renderContent = () => {
    switch (active) {
      case 'appearanceCustomize':
        return <CustomizeTab />;
      case 'appearanceHomepage':
        return <AppearancePreview />;
      case 'notificationsPreorders':
      case 'notificationsInventory':
      case 'notificationsCustomers':
      case 'notificationsReports':
      case 'notificationsAccount': {
        const section = active.replace('notifications', '').toLowerCase();
        const resolved = section === 'preorders' ? 'preorders' : section;
        return <NotificationsTab key={resolved} section={resolved} />;
      }
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

  const mobileOptions = useMemo(() => {
    const opts: {value: string; label: string}[] = [];
    for (const item of filteredTop) {
      if (item.hasChildren) {
        for (const c of filteredChildren(item.id)) {
          opts.push({value: c.id, label: `${item.label} › ${c.label}`});
        }
      } else {
        opts.push({value: item.id, label: item.label});
      }
    }
    return opts;
  }, [filteredTop, filteredChildren]);

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
                const items = filteredTop.filter(t => t.group === g);
                if (items.length === 0) return null;
                return (
                  <div key={g}>
                    {gi > 0 && <div className="my-2 border-t border-gray-200" />}
                    <ul className="space-y-0.5">
                      {items.map(item => {
                        const Icon = item.icon;
                        const children = item.hasChildren ? filteredChildren(item.id) : [];
                        if (item.hasChildren) {
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenParents(p => ({...p, [item.id]: !p[item.id]}))
                                }
                                className={cn(
                                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                  'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{item.label}</span>
                                <ChevronDown
                                  className={cn(
                                    'ml-auto h-4 w-4 shrink-0 transition-transform',
                                    openParent(item.id) && 'rotate-180'
                                  )}
                                />
                              </button>
                              {openParent(item.id) && children.length > 0 && (
                                <ul className="mt-0.5 space-y-0.5">
                                  {children.map(child => {
                                    const ChildIcon = child.icon;
                                    const childActive = active === child.id;
                                    return (
                                      <li key={child.id}>
                                        <button
                                          type="button"
                                          onClick={() => setActive(child.id)}
                                          className={cn(
                                            'flex w-full items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-sm transition-colors',
                                            childActive
                                              ? 'bg-gray-100 font-semibold text-gray-900'
                                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
                                  ? 'bg-gray-100 font-semibold text-gray-900'
                                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
            options={mobileOptions.map(o => ({value: o.value, label: o.label}))}
          />
        </div>

        {/* Content panel */}
        <main className="min-w-0 flex-1">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{activeInfo.label}</h2>
            <p className="mt-1 text-sm text-gray-500">{activeInfo.subtitle}</p>
          </div>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}