'use client';
import {usePathname, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {useState, useRef, useCallback, useEffect} from 'react';
import {ShoppingCart, Tag, User, Star, LogOut, Gift} from 'lucide-react';
import CustomerCartDrawer from '@/shared/components/cart/CustomerCartDrawer';
import CustomerNotificationBell from '@/features/customer/notifications/components/CustomerNotificationBell';
import {Toaster} from 'sonner';

const TABS = [
  {
    label: 'Order',
    tab: null,
    icon: ShoppingCart,
    href: '/customer/dashboard'
  },
  {
    label: 'Promos',
    tab: 'promos',
    icon: Tag,
    href: '/customer/dashboard?tab=promos'
  },
  {
    label: 'Reviews',
    tab: 'reviews',
    icon: Star,
    href: '/customer/dashboard?tab=reviews'
  },
  {
    label: 'Rewards',
    tab: 'rewards',
    icon: Gift,
    href: '/customer/dashboard?tab=rewards'
  },
  {
    label: 'Profile',
    tab: 'profile',
    icon: User,
    href: '/customer/dashboard?tab=profile'
  }
];

type DashboardLayoutProps = {
  children: React.ReactNode;
  order?: React.ReactNode;
  promos?: React.ReactNode;
  notification?: React.ReactNode;
  history?: React.ReactNode;
  profile?: React.ReactNode;
  reviews?: React.ReactNode;
  rewards?: React.ReactNode;
};

export default function DashboardLayout({
  children,
  order,
  promos: promosSlot,
  notification,
  history,
  profile,
  reviews: reviewsSlot,
  rewards: rewardsSlot
}: DashboardLayoutProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tab = searchParams.get('tab');
  const router = useRouter();
  const logoutMutation = useLogout();
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
    promos: promosSlot,
    notification,
    history,
    profile,
    reviews: reviewsSlot,
    rewards: rewardsSlot
  };

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/sign-in');
  };

  const isActive = (itemTab: string | null) =>
    itemTab === null ? !tab : tab === itemTab;

  const isStandalonePage =
    pathname.startsWith('/customer/dashboard/checkout') ||
    pathname.startsWith('/customer/dashboard/order-confirmation');
  const content = isStandalonePage
    ? children
    : tab && slotByTab[tab]
      ? slotByTab[tab]
      : (order ?? children);

  return (
    <div className="flex h-screen cursor-default bg-gray-50">
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

        <nav
          className={`flex-1 flex flex-col gap-1 ${sidebarExpanded ? 'px-2' : 'px-0'} py-4 overflow-y-auto overflow-x-hidden`}
        >
          {TABS.map(item => {
            const Icon = item.icon;
            const active = isActive(item.tab);
            const badgeCount = 0;
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
                    {badgeCount > 0 && active && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
                        {badgeCount}
                      </span>
                    )}
                  </span>
                  {badgeCount > 0 && !sidebarExpanded && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f08080] px-1 text-[10px] font-bold text-white">
                      {badgeCount}
                    </span>
                  )}
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

      <main className="relative flex-1 overflow-y-auto bg-gray-50 pb-24 md:pb-0">
        <div className="pointer-events-none absolute top-3 right-4 z-30">
          <div className="pointer-events-auto">
            <CustomerNotificationBell />
          </div>
        </div>
        <div className="px-4 py-10">{content}</div>
      </main>

      <nav
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-50
          bg-[#2d4a35] border-t border-[#3a5c44]
          flex items-center justify-around
          px-2 pt-3 pb-[env(safe-area-inset-bottom,10px)]
        "
      >
        {TABS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.tab);
          const label = (
            'mobileLabel' in item ? item.mobileLabel : item.label
          ) as string;
          const badgeCount =
            0;
          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex flex-col items-center gap-1 px-3 py-1 min-w-15 transition-all duration-200"
            >
              <div className="relative">
                <Icon
                  size={22}
                  className={`transition-colors duration-200 ${
                    active ? 'text-[#7ed4a0]' : 'text-[#5a8a6a]'
                  }`}
                />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f08080] px-1 text-[10px] font-bold text-white">
                    {badgeCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-bold leading-none transition-colors duration-200 ${
                  active ? 'text-[#7ed4a0]' : 'text-[#5a8a6a]'
                }`}
              >
                {label}
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
      </nav>

      <CustomerCartDrawer />
      <Toaster position="top-right" richColors duration={2500} visibleToasts={4} />
    </div>
  );
}
