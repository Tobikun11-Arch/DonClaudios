import {Z} from '@/lib/zIndex';

// The customer and owner dashboards both render a `md:hidden` bottom nav
// (app/(customer)/customer/dashboard/layout.tsx and
// app/(owner)/owner/dashboard/layout.tsx) that is ~72px tall including its own
// `pb-[env(safe-area-inset-bottom,10px)]` padding. The support bubble is
// `h-14` (56px) tall, so a plain `bottom-5` (20px) lands it entirely on top of
// the nav's rightmost tab -- Profile for customers, More for owners -- and
// the bubble's `Z.floating` layer makes that tab untappable.
//
// `4.5rem` (72px) reproduces the nav's own 10px safe-area fallback, giving a
// ~10px gap at every inset size. `md:bottom-5` restores the desktop position,
// since the nav is `md:hidden`.
//
// `Z.floating` (60) also keeps the bubble below the cart drawer overlay and
// its modals (1000+): an open drawer dims the bubble and covers "Go To
// Checkout" instead of the bubble floating over the drawer's Total/CTA.
export const supportBubbleClass =
  `fixed right-5 ${Z.floating} flex flex-col items-end ` +
  'bottom-[calc(env(safe-area-inset-bottom,10px)+4.5rem)] md:bottom-5';

// `100dvh` rather than `vh` so mobile browser chrome does not push the panel
// off-screen. The `10.5rem` (168px) reserve covers the lifted bubble offset
// (`4.5rem` nav + safe area) + the `h-14` (56px) bubble + the `mb-3` (12px)
// gap = 138px, plus the panel's own 12px margin, leaving ~18px of headroom.
// The previous `7rem` (112px) under-reserved by 38px, which on a 375x667 or
// 320x568 phone clipped the panel header -- taking the title and the close
// button off the top of the screen.
export const supportPanelHeightCustomerClass =
  'h-[min(480px,calc(100dvh-10.5rem))]';

export const supportPanelHeightOwnerClass =
  'h-[min(560px,calc(100dvh-10.5rem))]';
