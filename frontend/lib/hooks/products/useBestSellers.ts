'use client';

import {useQuery} from '@tanstack/react-query';
import {listBestSellerIds} from '@/lib/api/productsApi';

/**
 * Best-seller product ids for the menu's Featured tab. The server caches the
 * ranking for a few minutes, so a long stale time here costs nothing. A
 * failure just hides the section, so it is not retried aggressively.
 */
export function useBestSellerIds(limit = 6) {
  return useQuery({
    queryKey: ['products', 'best-sellers', limit],
    queryFn: () => listBestSellerIds(limit),
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
}
