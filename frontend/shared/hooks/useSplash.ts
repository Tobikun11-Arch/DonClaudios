'use client';

import {useEffect, useRef, useState} from 'react';

export function useSplash(ready: boolean, minMs = 2000): boolean {
  const [show, setShow] = useState(true);
  const mountedAt = useRef<number | null>(null);

  useEffect(() => {
    if (mountedAt.current === null) mountedAt.current = Date.now();
    if (!ready) return;
    const remaining = Math.max(0, minMs - (Date.now() - mountedAt.current));
    const id = setTimeout(() => setShow(false), remaining);
    return () => clearTimeout(id);
  }, [ready, minMs]);

  return show;
}