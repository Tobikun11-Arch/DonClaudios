// The customer and owner dashboards both render a `md:hidden` bottom nav
// (app/(customer)/customer/dashboard/layout.tsx and
// app/(owner)/owner/dashboard/layout.tsx) that is ~72px tall including its own
// `pb-[env(safe-area-inset-bottom,10px)]` padding. The support bubble is
// `h-14` (56px) tall, so a plain `bottom-5` (20px) lands it entirely on top of
// the nav's rightmost tab -- Profile for customers, More for owners -- and
// `z-[100]` makes that tab untappable.
//
// `4.5rem` (72px) reproduces the nav's own 10px safe-area fallback, giving a
// ~10px gap at every inset size. `md:bottom-5` restores the desktop position,
// since the nav is `md:hidden`.
export const supportBubbleClass =
  'fixed right-5 z-[100] flex flex-col items-end ' +
  'bottom-[calc(env(safe-area-inset-bottom,10px)+4.5rem)] md:bottom-5';

// `100dvh` rather than `vh` so mobile browser chrome does not push the panel
// off-screen. The `7rem` reserve covers the lifted bubble offset plus the
// `mb-3` gap and some breathing room at the top of the viewport.
export const supportPanelHeightCustomerClass =
  'h-[min(480px,calc(100dvh-7rem))]';

export const supportPanelHeightOwnerClass =
  'h-[min(560px,calc(100dvh-7rem))]';
