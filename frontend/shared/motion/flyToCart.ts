/**
 * Visual-only "added to cart" moment. Never touches cart state: the caller
 * adds the item exactly as before, this only draws a copy of the photo
 * travelling to the cart icon.
 *
 * Moving in arcs: the copy follows a curve that bulges ~15% of the distance
 * off the straight line, lifting (scale up, bigger shadow) at the top.
 * Staging: the motions are chained, never parallel. The photo lands first,
 * then the spot it lands on squashes (squash & stretch on impact).
 */

const TRAVEL_MS = 380;
const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/** Bump the visible cart target without flying anything (e.g. detail page). */
export function bumpCart() {
  if (typeof document === 'undefined' || prefersReducedMotion()) return;
  if (!document.documentElement.dataset.uxMotion) return;
  const targets = document.querySelectorAll<HTMLElement>('[data-cart-target]');
  targets.forEach(el => {
    if (el.offsetParent === null) return; // hidden (other breakpoint)
    squash(el);
  });
}

/** Wait for the cart drawer to settle before measuring where the item lands. */
const DRAWER_SETTLE_MS = 240;

function findTarget(productId?: string): HTMLElement | undefined {
  const visible = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  if (productId) {
    const row = Array.from(
      document.querySelectorAll<HTMLElement>('[data-cart-item]')
    ).find(el => el.dataset.cartItem === productId && visible(el));
    if (row) return row;
  }
  return Array.from(
    document.querySelectorAll<HTMLElement>('[data-cart-target]')
  ).find(visible);
}

/**
 * Fly a copy of the product photo from `source` into the cart. The cart
 * drawer opens on add, so the copy lifts in place while the drawer arrives
 * (anticipation), then travels on an arc into that item's row, which
 * squashes as it lands.
 */
export function flyToCart(source: Element | null | undefined, productId?: string) {
  try {
    if (!source || typeof document === 'undefined') return;
    if (!document.documentElement.dataset.uxMotion) return;
    if (prefersReducedMotion()) return;

    const from = source.getBoundingClientRect();
    if (from.width === 0) return;

    const size = Math.min(from.width, from.height, 96);
    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;

    const ghost = document.createElement('div');
    const img = source.querySelector('img');
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${startX}px`,
      top: `${startY}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '9999px',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '2147483000',
      backgroundColor: '#7ed4a0',
      backgroundImage: img?.currentSrc ? `url("${img.currentSrc}")` : '',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      willChange: 'transform, opacity'
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.appendChild(ghost);

    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      ghost.remove();
    };
    window.setTimeout(cleanup, DRAWER_SETTLE_MS + TRAVEL_MS + 500);

    // Anticipation: a small wind-up (0.95) then a lift while the drawer opens.
    ghost.animate(
      [
        {transform: 'scale(0.6)', opacity: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.15)'},
        {transform: 'scale(0.95)', opacity: 1, offset: 0.5},
        {transform: 'scale(1)', opacity: 1, boxShadow: '0 10px 24px rgba(0,0,0,0.22)'}
      ],
      {duration: DRAWER_SETTLE_MS, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards'}
    );

    window.setTimeout(() => {
      if (removed) return;
      const target = findTarget(productId);
      if (!target) {
        cleanup();
        return;
      }
      const to = target.getBoundingClientRect();
      const endX = to.left + to.width / 2 - size / 2;
      const endY = to.top + to.height / 2 - size / 2;
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.hypot(dx, dy);
      // Moving in arcs: only when the move differs on both axes by > 40px.
      const arcs = Math.abs(dx) > 40 && Math.abs(dy) > 40;
      const bulge = arcs ? distance * 0.15 : 0;
      const nx = distance ? -dy / distance : 0;
      const ny = distance ? dx / distance : 0;
      const sign = ny > 0 ? -1 : 1; // always bulge upward
      const endScale = Math.max(0.2, Math.min(to.width, to.height) / size);

      const frames: Keyframe[] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const lift = Math.sin(Math.PI * t);
        const x = dx * t + nx * bulge * lift * sign;
        const y = dy * t + ny * bulge * lift * sign;
        const scale = (1 + (endScale - 1) * t) * (1 + 0.3 * lift);
        frames.push({
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
          boxShadow: `0 ${6 + 14 * lift}px ${14 + 24 * lift}px rgba(0,0,0,${0.18 + 0.12 * lift})`,
          opacity: t > 0.8 ? 1 - ((t - 0.8) / 0.2) * 0.7 : 1,
          offset: t
        });
      }
      const anim = ghost.animate(frames, {
        duration: TRAVEL_MS,
        easing: EASE_IN_OUT,
        fill: 'forwards'
      });
      anim.onfinish = () => {
        cleanup();
        // Staging: the landing spot reacts only after the photo arrives.
        squash(target);
      };
      anim.oncancel = cleanup;
    }, DRAWER_SETTLE_MS);
  } catch {
    // Purely decorative: never let it break adding to the cart.
  }
}

function squash(el: HTMLElement) {
  el.animate(
    [
      {transform: 'scale(1, 1)'},
      {transform: 'scale(1.15, 0.87)', offset: 0.3},
      {transform: 'scale(0.95, 1.05)', offset: 0.6},
      {transform: 'scale(1, 1)'}
    ],
    {duration: 220, easing: 'cubic-bezier(0.32, 0.72, 0, 1)'}
  );
}

/**
 * Fly only once the add really went through: the cart drawer opening is the
 * signal (it opens on every successful add, guest or signed in, and stays
 * shut when the add is refused with a toast). Waits up to 4s for a slow
 * network add, then gives up silently.
 */
export function flyWhenCartOpens(
  source: Element | null | undefined,
  productId: string,
  isOpenNow: () => boolean,
  subscribe: (listener: (open: boolean) => void) => () => void
) {
  if (typeof window === 'undefined') return;
  // Measure now: the card is about to sit under the drawer's scrim.
  const go = () => flyToCart(source, productId);
  if (isOpenNow()) {
    go();
    return;
  }
  let done = false;
  const unsubscribe = subscribe(open => {
    if (done || !open) return;
    done = true;
    unsubscribe();
    go();
  });
  window.setTimeout(() => {
    if (done) return;
    done = true;
    unsubscribe();
  }, 4000);
}
