'use client';

import {useEffect, useRef, useState} from 'react';

export function useSplash(ready: boolean, minMs = 2000): boolean {
  const [show, setShow] = useState(() => !ready);
  const mountedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) {
      mountedAt.current = mountedAt.current ?? Date.now();
      return;
    }
    if (mountedAt.current === null) return;
    const remaining = Math.max(0, minMs - (Date.now() - mountedAt.current));
    const id = setTimeout(() => setShow(false), remaining);
    return () => clearTimeout(id);
  }, [ready, minMs]);

  return show;
}