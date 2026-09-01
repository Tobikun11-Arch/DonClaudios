'use client';
import {useSearchParams} from 'next/navigation';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {useState, useRef, useCallback, useEffect} from 'react';
import {
  LayoutDashboard,
  Package,
  Archive,
  Tag,
  Palette,
  Star,
  Settings,
  LogOut,
  MoreHorizontal,
  X,
  ChevronRight
} from 'lucide-react';
import {Toaster} from 'sonner';

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
    label: 'Appearance',
    tab: 'appearance',
    icon: Palette,
    href: '/owner/dashboard?tab=appearance'
  },
  {
    label: 'Reviews',
    tab: 'reviews',
    icon: Star,
    href: '/owner/dashboard?tab=reviews'
  },
  {
    label: 'Settings',
    tab: 'settings',
    icon: Settings,
    href: '/owner/dashboard/settings'
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
  reviews?: React.ReactNode;
};

export default function DashboardLayout({
  children,
  products,
  inventory,
  promos,
  cashiers,
  appearance,
  reviews: reviewsSlot
}: DashboardLayoutProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab = searchParams.get('tab');
  const router = useRouter();
  const logoutMutation = useLogout();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const collapseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const handleSidebarEnter = useCallback(() => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
    setSidebarExpanded(true);
  }, []);

  const handleSidebarLeave = useCallback(() => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
    collapseTimeoutRef.current = setTimeout(() => {
      setSidebarExpanded(false);
    }, 100);
  }, []);

  const slotByTab: Record<string, React.ReactNode | undefined> = {
    products,
    inventory,
    promos,
    cashiers,
    appearance,
    reviews: reviewsSlot
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logoutMutation.mutateAsync();
    router.replace('/sign-in');
  };

  const isActive = (itemTab: string | null) => {
    if (itemTab === 'settings') {
      return pathname.endsWith('/settings');
    }
    if (itemTab === null) {
      return !tab;
    }
    return tab === itemTab;
  };

  const drawerTabActive = DRAWER_ITEMS.some(i => isActive(i.tab));

  return (
    <div className="flex h-screen cursor-default bg-gray-50">
      {/* ── Desktop Sidebar ── */}
      <aside
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className={`
          hidden md:flex flex-col flex-shrink-0 overflow-hidden
          min-h-screen bg-[#2d4a35] z-40
          transition-[width,box-shadow] duration-200 ease-out
          ${sidebarExpanded ? 'w-64 shadow-2xl' : 'w-[72px] shadow-xl'}
        `}
      >
        {/* Logo Area */}
        <div
          className={`relative flex items-center justify-center px-4 border-b border-[#3a5c44] transition-[height,padding] duration-200 ease-out ${sidebarExpanded ? 'h-[178px] py-6' : 'h-24 py-2'}`}
        >
          <div
            className={`absolute transition-[opacity,transform] duration-150 ease-out ${
              sidebarExpanded
                ? 'opacity-0 scale-90 pointer-events-none'
                : 'opacity-100 scale-100'
            }`}
          >
            <Image
              src="/assets/logo.png"
              alt="DC"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
          </div>
          <div
            className={`transition-[opacity,transform] duration-150 ease-out ${
              sidebarExpanded
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            <Image
              src="/assets/logo.png"
              alt="Don Claudio's Lechon House"
              width={130}
              height={130}
              className="object-contain drop-shadow-lg"
              priority
            />
          </div>
        </div>

        {/* Nav Items */}
        <nav
          className={`flex-1 flex flex-col gap-1 ${sidebarExpanded ? 'px-2' : 'px-0'} py-4 overflow-y-auto overflow-x-hidden`}
        >
          {ALL_SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.tab);
            return (
              <div key={item.label} className="relative group/nav">
                <Link
                  href={item.href}
                  className={`
                    relative flex items-center py-3 rounded-xl
                    ${sidebarExpanded ? 'gap-3 px-3' : 'gap-0 px-0 justify-center'}
                    text-sm font-semibold tracking-wide
                    transition-[padding,gap] duration-200 ease-out
                    ${
                      sidebarExpanded
                        ? active
                          ? 'bg-[#4a7c59] text-white shadow-md shadow-[#2d4a35]/50'
                          : 'text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white'
                        : active
                          ? 'text-white'
                          : 'text-[#b8d4c0] hover:bg-[#3a5c44] hover:text-white'
                    }
                  `}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/80 rounded-r-full" />
                  )}
                  <Icon
                    size={20}
                    className={`
                      shrink-0 transition-transform duration-200
                      ${!active ? 'group-hover/nav:scale-110' : ''}
                    `}
                  />
                  <span
                    className={`
                      whitespace-nowrap overflow-hidden
                      transition-[opacity,width] duration-200 ease-out
                      ${sidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                    `}
                  >
                    {item.label}
                  </span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          className={`${sidebarExpanded ? 'px-2' : 'px-0'} pb-5 pt-2 border-t border-[#3a5c44]`}
        >
          <div className="relative group/nav">
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className={`
                w-full flex items-center py-3 rounded-xl
                ${sidebarExpanded ? 'gap-3 px-3' : 'gap-0 px-0 justify-center'}
                text-sm font-semibold tracking-wide
                text-[#f08080] hover:bg-[#3a1a1a] hover:text-red-300
                transition-[padding,gap] duration-200 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <LogOut
                size={20}
                className="shrink-0 transition-transform duration-200 group-hover/nav:scale-110"
              />
              <span
                className={`
                  whitespace-nowrap overflow-hidden
                  transition-[opacity,width] duration-200 ease-out
                  ${sidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
                `}
              >
                {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto bg-gray-50 pb-24 md:pb-0">
        {tab === 'appearance' ? (
          <>{appearance}</>
        ) : (
          <div className="px-6 py-6">
            {tab && slotByTab[tab] ? slotByTab[tab] : children}
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Nav ── */}
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

          <span
            className={`
              mt-1 h-0.5 w-6 rounded-full bg-[#7ed4a0]
              transition-all duration-300 ease-out
              ${drawerTabActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
            `}
          />
        </button>
      </nav>

      {/* ── Mobile Drawer Overlay ── */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`
          md:hidden fixed inset-0 bg-black/50
          transition-opacity duration-300
          ${
            drawerOpen
              ? 'z-60 opacity-100 pointer-events-auto'
              : '-z-10 opacity-0 pointer-events-none'
          }
        `}
      />

      {/* ── Mobile Drawer ── */}
      <div
        className={`
          md:hidden fixed bottom-0 left-0 right-0
          bg-[#2d4a35] rounded-t-3xl
          transition-transform duration-300 ease-out
          pb-[env(safe-area-inset-bottom,16px)]
          ${
            drawerOpen
              ? 'z-70 translate-y-0 pointer-events-auto'
              : '-z-10 translate-y-full pointer-events-none'
          }
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

      <Toaster position="top-right" richColors duration={2500} visibleToasts={4} />
    </div>
  );
}
