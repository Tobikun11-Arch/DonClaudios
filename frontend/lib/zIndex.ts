/**
 * App-wide stacking order — one scale for every fixed/absolute layer.
 *
 * Every value is a literal Tailwind class string so the class scanner picks
 * them up from this file (same mechanism as `supportBubbleClass`). Never
 * write `!important` or one-off huge z-indexes; add a tier here instead.
 *
 *   0        page content
 *   40       sidebar
 *   50       bottom nav / public site header
 *   60       floating chrome: notification bell, support chat bubble
 *   100-999  page-level dialogs (rewards, order tracking, popovers)
 *   1000     cart drawer overlay (full-screen backdrop container)
 *   1100     order type modal + its backdrop (must cover the cart drawer)
 *   1200     cart remove confirm modal
 *   1300     global blocking modal (store closed)
 *   1400     splash / loading gate
 *   ── toasts (sonner) render with their own near-top z-index ──
 *
 * The rule the scale exists to enforce: the floating chrome (bell, chat
 * bubble) lives at 60, so any overlay/backdrop at >= 1000 dims it and eats
 * its clicks instead of the other way round.
 */
export const Z = {
  floating: 'z-[60]',
  drawerOverlay: 'z-[1000]',
  orderModal: 'z-[1100]',
  cartConfirm: 'z-[1200]',
  globalModal: 'z-[1300]',
  splash: 'z-[1400]'
} as const;
