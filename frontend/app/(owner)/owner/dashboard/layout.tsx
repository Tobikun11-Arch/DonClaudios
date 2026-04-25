'use client';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {useState} from 'react';
import {
  LayoutDashboard,
  Package,
  Archive,
  Tag,
  Users,
  Palette,
  LogOut,
  MoreHorizontal,
  X,
  ChevronRight
} from 'lucide-react';

const PRIMARY_TABS = [
  {
    label: 'Dashboard',
    mobileLabel: 'Home',
    tab: null,
    icon: LayoutDashboard,
    href: '/owner/dashboard'
  },
  {
    label: 'Products',
    mobileLabel: 'Products',
    tab: 'products',
    icon: Package,
    href: '/owner/dashboard?tab=products'
  },
  {
    label: 'Inventory',
    mobileLabel: 'Inventory',
    tab: 'inventory',
    icon: Archive,
    href: '/owner/dashboard?tab=inventory'
  }
];

const DRAWER_ITEMS = [
  {
    label: 'Promos',
    tab: 'promos',
    icon: Tag,
    href: '/owner/dashboard?tab=promos'
  },
  {
    label: 'Cashiers',
    tab: 'cashiers',
    icon: Users,
    href: '/owner/dashboard?tab=cashiers'
  },
  {
    label: 'Appearance',
    tab: 'appearance',
    icon: Palette,
    href: '/owner/dashboard?tab=appearance'
  }
];

const ALL_SIDEBAR_ITEMS = [...PRIMARY_TABS, ...DRAWER_ITEMS];

type DashboardLayoutProps = {
  children: React.ReactNode;
  products?: React.ReactNode;
  inventory?: React.ReactNode;
  promos?: React.ReactNode;
  cashiers?: React.ReactNode;
  appearance?: React.ReactNode;
};

export default function DashboardLayout({
  children,
  products,
  inventory,
  promos,
  cashiers,
  appearance
}: DashboardLayoutProps) {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const router = useRouter();
  const logoutMutation = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const slotByTab: Record<string, React.ReactNode | undefined> = {
    products,
    inventory,
    promos,
    cashiers,
    appearance
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logoutMutation.mutateAsync();
    router.replace('/sign-in');
  };

  const isActive = (itemTab: string | null) =>
    itemTab === null ? !tab : tab === itemTab;

  const drawerTabActive = DRAWER_ITEMS.some(i => isActive(i.tab));

  return (
    <div className="flex h-screen cursor-default bg-gray-50">
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#2d4a35] shadow-xl z-40">
        <div className="flex items-center justify-center py-6 px-4 border-b border-[#3a5c44]">
          <Image
            src="/assets/logo.png"
            alt="Don Claudio's Lechon House"
            width={130}
            height={130}
            className="object-contain drop-shadow-lg"
            priority
          />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
          {ALL_SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.tab);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  text-sm font-semibold tracking-wide
                  transition-all duration-200
                  ${
                    active
                      ? 'bg-[#4a7c59] text-white'
                      : 'text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white'
                  }
                `}
              >
                <Icon size={20} className="shrink-0" />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 pt-2 border-t border-[#3a5c44]">
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="
              w-full flex items-center gap-3 px-4 py-3 rounded-xl
              text-sm font-semibold tracking-wide
              text-[#f08080] hover:bg-[#3a1a1a] hover:text-red-300
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <LogOut size={20} className="shrink-0" />
            <span>{logoutMutation.isPending ? 'Logging out…' : 'Logout'}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50 pb-24 md:pb-0">
        <div className="p-4 md:p-6">
          {tab && slotByTab[tab] ? slotByTab[tab] : children}
        </div>
      </main>

      <nav
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-50
          bg-[#2d4a35] border-t border-[#3a5c44]
          flex items-center justify-around
          px-2 pt-3 pb-[env(safe-area-inset-bottom,10px)]
        "
      >
        {PRIMARY_TABS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.tab);
          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex flex-col items-center gap-1 px-3 py-1 min-w-15 transition-all duration-200"
            >
              <Icon
                size={22}
                className={`transition-colors duration-200 ${
                  active ? 'text-[#7ed4a0]' : 'text-[#5a8a6a]'
                }`}
              />
              <span
                className={`text-[10px] font-bold leading-none transition-colors duration-200 ${
                  active ? 'text-[#7ed4a0]' : 'text-[#5a8a6a]'
                }`}
              >
                {item.mobileLabel}
              </span>

              {/* Active underline indicator BELOW the label */}
              <span
                className={`
          mt-1 h-0.5 w-6 rounded-full bg-[#7ed4a0]
          transition-all duration-300 ease-out
          ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
        `}
              />
            </Link>
          );
        })}

        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex flex-col items-center gap-1 px-3 py-1 min-w-15 transition-all duration-200"
        >
          <span
            className={`
              absolute -top-1 w-1.5 h-1.5 rounded-full bg-[#7ed4a0]
              transition-all duration-300 ease-out
              ${drawerTabActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
            `}
          />
          <MoreHorizontal
            size={22}
            className={`transition-colors duration-200 ${
              drawerTabActive ? 'text-[#7ed4a0]' : 'text-[#5a8a6a]'
            }`}
          />
          <span
            className={`text-[10px] font-bold leading-none transition-colors duration-200 ${
              drawerTabActive ? 'text-[#7ed4a0]' : 'text-[#5a8a6a]'
            }`}
          >
            More
          </span>
        </button>
      </nav>

      <div
        onClick={() => setDrawerOpen(false)}
        className={`
          md:hidden fixed inset-0 z-60 bg-black/50
          transition-opacity duration-300
          ${
            drawerOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }
        `}
      />

      <div
        className={`
          md:hidden fixed bottom-0 left-0 right-0 z-70
          bg-[#2d4a35] rounded-t-3xl
          transition-transform duration-300 ease-out
          pb-[env(safe-area-inset-bottom,16px)]
          ${drawerOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex flex-col gap-1">
            <div className="w-10 h-1 rounded-full bg-[#4a7c59] mb-1" />
            <span className="text-xs font-bold text-[#7aab8a] uppercase tracking-widest">
              More Options
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-full hover:bg-[#3a5c44] text-[#7aab8a] hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-4 border-t border-[#3a5c44]">
          <div className="flex flex-col gap-1 pt-3">
            {DRAWER_ITEMS.map(item => {
              const Icon = item.icon;
              const active = isActive(item.tab);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`
                    flex items-center gap-4 px-4 py-3.5 rounded-2xl
                    text-sm font-semibold
                    transition-all duration-200
                    ${
                      active
                        ? 'bg-[#4a7c59] text-white'
                        : 'text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={16} className="opacity-40" />
                </Link>
              );
            })}
          </div>

          <div className="my-3 border-t border-[#3a5c44]" />

          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="
              w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl
              text-sm font-semibold
              text-[#f08080] hover:bg-[#3a1a1a] hover:text-red-300
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <LogOut size={20} className="shrink-0" />
            <span className="flex-1">
              {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
