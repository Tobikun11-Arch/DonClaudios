'use client';

import {useEffect} from 'react';
import {httpClient} from '@/lib/api/httpClient';

/** Must stay under the backend PRESENCE_TIMEOUT_MS (3 min, utils/presence.ts). */
const HEARTBEAT_MS = 60_000;

/**
 * Keeps the owner's Online/Offline status for this cashier fresh: one beat
 * when the dashboard opens or the tab comes back, then one a minute while
 * the tab is visible. A closed tab simply stops beating and goes offline.
 */
export function useCashierHeartbeat(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const beat = () => {
      if (document.visibilityState !== 'visible') return;
      httpClient.post('/auth/heartbeat').catch(() => {
        // Presence is best effort; the next beat retries.
      });
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [enabled]);
}
