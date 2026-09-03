'use client';

import {useEffect, useRef, useCallback} from 'react';
import {useSearchParams} from 'next/navigation';

const HIGHLIGHT_DURATION_MS = 2500;
const RETRY_INTERVAL_MS = 150;
const MAX_WAIT_MS = 8000;

export function useScrollToHighlight(paramKey = 'highlight') {
  const searchParams = useSearchParams();
  const targetId = searchParams.get(paramKey);
  const isOpenChat = searchParams.get('openChat') === '1';
  const highlightedRef = useRef(false);

  const scrollToElement = useCallback((id: string) => {
    const el = document.querySelector(
      `[id="${id}"], [id="order-${id}"], [id="review-${id}"]`
    ) as HTMLElement | null;
    if (!el) return false;

    el.scrollIntoView({behavior: 'smooth', block: 'center'});
    el.classList.add('ring-highlight');
    setTimeout(() => el.classList.remove('ring-highlight'), HIGHLIGHT_DURATION_MS);
    return true;
  }, []);

  useEffect(() => {
    if (!targetId || highlightedRef.current) return;
    highlightedRef.current = true;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const found = scrollToElement(targetId);
      if (found || Date.now() - startedAt > MAX_WAIT_MS) {
        clearInterval(interval);
      }
    }, RETRY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [targetId, scrollToElement]);

  useEffect(() => {
    highlightedRef.current = false;
  }, [targetId]);

  return {highlightId: targetId, isOpenChat};
}
