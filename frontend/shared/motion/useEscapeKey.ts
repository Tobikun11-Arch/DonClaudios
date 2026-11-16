'use client';

import {useEffect, useRef} from 'react';

/**
 * Jakob's law: Esc closes the top layer, like everywhere else. Calls the same
 * close handler the backdrop click already uses, so nothing new can happen.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  useEffect(() => {
    handler.current = onEscape;
  });

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}
