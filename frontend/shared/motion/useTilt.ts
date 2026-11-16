'use client';

import {useCallback, type PointerEvent} from 'react';

/**
 * Solid drawing in 3D: tilts a card toward the pointer (max `max` degrees)
 * with real perspective (.ux-tilt-scene / .ux-tilt in app/motion.css) and
 * moves a light spot with it. Pointer-driven, so it is written straight
 * ahead; the release eases back to rest through the CSS transition. Mouse and
 * pen only: touch scrolling never tilts the card.
 */
export function useTilt<T extends HTMLElement>(max = 8) {
  const onPointerMove = useCallback(
    (e: PointerEvent<T>) => {
      if (e.pointerType === 'touch') return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height;
      el.dataset.tilting = 'true';
      el.style.setProperty('--ux-ry', `${(px - 0.5) * 2 * max}deg`);
      el.style.setProperty('--ux-rx', `${(0.5 - py) * 2 * max}deg`);
      el.style.setProperty('--ux-lx', `${px * 100}%`);
      el.style.setProperty('--ux-ly', `${py * 100}%`);
    },
    [max]
  );

  const onPointerLeave = useCallback((e: PointerEvent<T>) => {
    const el = e.currentTarget;
    el.dataset.tilting = 'false';
    el.style.setProperty('--ux-ry', '0deg');
    el.style.setProperty('--ux-rx', '0deg');
  }, []);

  return {onPointerMove, onPointerLeave};
}
