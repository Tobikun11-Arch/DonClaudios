'use client';

import {useEffect} from 'react';
import {useSearchParams} from 'next/navigation';

const HIGHLIGHT_DURATION_MS = 3600;
const RETRY_INTERVAL_MS = 150;
// Long enough for a cold backend right after login, when the list loads late.
const MAX_WAIT_MS = 20_000;

function findTarget(id: string) {
  return document.querySelector(
    `[id="${id}"], [id="order-${id}"], [id="review-${id}"]`
  ) as HTMLElement | null;
}

function flash(el: HTMLElement) {
  // Wait a frame so the list has its final layout, then glide to the item.
  requestAnimationFrame(() => {
    el.scrollIntoView({behavior: 'smooth', block: 'center'});
    // Re-adding the class restarts the animation on a repeat click.
    el.classList.remove('ring-highlight');
    void el.offsetWidth;
    el.classList.add('ring-highlight');
    window.setTimeout(() => el.classList.remove('ring-highlight'), HIGHLIGHT_DURATION_MS);
  });
}

/**
 * Scrolls smoothly to `?highlight=<id>` and flashes it. Waits for the item to
 * render (lists load after navigation). `hl` changes on every notification
 * click, so clicking the same notification twice highlights it again.
 */
export function useScrollToHighlight(paramKey = 'highlight') {
  const searchParams = useSearchParams();
  const targetId = searchParams.get(paramKey);
  const token = searchParams.get('hl');
  const isOpenChat = searchParams.get('openChat') === '1';

  useEffect(() => {
    if (!targetId) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const el = findTarget(targetId);
      if (el) {
        window.clearInterval(interval);
        flash(el);
      } else if (Date.now() - startedAt > MAX_WAIT_MS) {
        window.clearInterval(interval);
      }
    }, RETRY_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [targetId, token]);

  return {highlightId: targetId, highlightToken: token, isOpenChat};
}
