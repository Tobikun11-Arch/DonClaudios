'use client';
import {usePathname, useSearchParams} from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useLogout} from '@/lib/hooks/auth/useLogout';
import {useState, useRef, useCallback, useEffect} from 'react';
import {ShoppingCart, User, Star, LogOut, Gift} from 'lucide-react';
import CustomerCartDrawer from '@/shared/components/cart/CustomerCartDrawer';
import CustomerNotificationBell from '@/features/customer/notifications/components/CustomerNotificationBell';
import SupportChatBubble from '@/features/support/components/SupportChatBubble';
import {Z} from '@/lib/zIndex';
import {useBrand} from '@/lib/hooks/useBrand';
import {Toaster} from '@/components/ui/sonner';

const TABS = [
  {
    label: 'Order',
    tab: null,
    icon: ShoppingCart,
    href: '/customer/dashboard'
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
  notification?: React.ReactNode;
  history?: React.ReactNode;
  profile?: React.ReactNode;
  reviews?: React.ReactNode;
  rewards?: React.ReactNode;
};

export default function DashboardLayout({
  children,
  order,
  notification,
  history,
  profile,
  reviews: reviewsSlot,
  rewards: rewardsSlot
}: DashboardLayoutProps) {
  const searchParams = useSearchParams();
  const brand = useBrand();
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

  // Order history is part of the Order section, so both tabs keep `Order`
  // highlighted. Without this, opening `?tab=history` left no nav item active
  // in either the sidebar or the bottom bar. `history` is deliberately not its
  // own `TABS` entry: the bottom bar's items are `min-w-15 px-3`, so a sixth
  // entry would overflow at 320px.
  const isActive = (itemTab: string | null) =>
    itemTab === null ? !tab || tab === 'history' : tab === itemTab;

  const isStandalonePage =
    pathname.startsWith('/customer/dashboard/checkout') ||
    pathname.startsWith('/customer/dashboard/order-confirmation') ||
    pathname.startsWith('/customer/dashboard/preorder');
  const content = isStandalonePage
    ? children
    : tab && slotByTab[tab]
      ? slotByTab[tab]
      : (order ?? children);

  return (
    <div className="flex h-screen cursor-default bg-gray-50 dark:bg-gray-800">
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
              src={brand.logo}
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
              src={brand.logo}
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

      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-800">
        {/*
          `Z.floating` (60) keeps the bell under the cart drawer overlay and
          its modals (1000+), so an open drawer dims it and eats its clicks
          instead of the bell painting on top of the drawer header.
        */}
        {/*
          Below `md` this is a slim sticky app bar (logo left, bell right), the
          usual mobile pattern: the bell gets a real row that also carries the
          brand, instead of floating over an empty `pt-16` strip at the top of
          every tab. From `md` up the sidebar carries the brand, so the bar
          collapses to just the bell pinned top-right as before. One element
          for both keeps a single bell (and a single dropdown) mounted.
          No `backdrop-blur` here: a backdrop filter makes this header the
          containing block for the bell's `fixed` mobile sheet and backdrop,
          pinning them inside the 56px bar instead of the viewport.
        */}
        <header
          className={`
            sticky top-0 ${Z.floating} flex h-14 items-center justify-between
            border-b border-gray-200 bg-gray-50 px-4
            dark:border-gray-700 dark:bg-gray-800 sm:px-6
            md:absolute md:top-3 md:right-4 md:h-auto md:border-0
            md:bg-transparent md:p-0 md:dark:bg-transparent
          `}
        >
          <Link
            href="/customer/dashboard"
            className="flex min-w-0 items-center gap-2 md:hidden"
          >
            <Image
              src={brand.logo}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <span className="truncate text-sm font-bold text-[#2d4a35] dark:text-[#7ed4a0]">
              {brand.name}
            </span>
          </Link>
          <CustomerNotificationBell />
        </header>
        {/*
          The fixed bottom nav is `md:hidden`, so the clearance for it lives
          here rather than on `main`, which otherwise stacked `pb-24` on top
          of this element's own `py-10` for ~136px of dead space at the foot
          of every phone page. On desktop `pt-10` clears the bell pinned
          top-right (y=12..52).
        */}
        <div className="px-4 pt-4 pb-24 sm:px-6 sm:pt-6 md:pt-10 md:pb-8">
          {content}
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
        {TABS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.tab);
          const label = (
            'mobileLabel' in item ? item.mobileLabel : item.label
          ) as string;
          const badgeCount = 0;
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
      <Toaster duration={2500} />
      <SupportChatBubble />
    </div>
  );
}
