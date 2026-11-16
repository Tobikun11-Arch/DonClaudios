'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';

/**
 * Turns the UX motion layer (app/motion.css) on for the area it is rendered
 * in, by setting `data-ux-motion` on <html>. Setting it on <html> rather than
 * a wrapper means portalled toasts and modals are covered too, and no DOM
 * wrapper is added around existing layouts.
 *
 * `exceptHome` keeps the public homepage ("/") exactly as it was.
 */
export function UxMotionScope({exceptHome = false}: {exceptHome?: boolean}) {
  const pathname = usePathname();
  const enabled = !(exceptHome && pathname === '/');

  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      delete root.dataset.uxMotion;
      return;
    }
    root.dataset.uxMotion = 'on';
    return () => {
      delete root.dataset.uxMotion;
    };
  }, [enabled]);

  return null;
}
