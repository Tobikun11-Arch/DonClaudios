'use client';

import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {toast} from 'sonner';
import {useCartStore} from '@/app/store/cartStore';

/**
 * Guest carts live in this browser's localStorage. After 1 hour with no cart
 * change or page visit, the next visit clears the cart and says so once.
 * Signed-in customers use the server cart, which this never touches.
 */
export default function GuestCartExpiry() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Pick up activity from other tabs before deciding.
      await useCartStore.persist.rehydrate();
      if (cancelled) return;
      const store = useCartStore.getState();
      if (store.expireIfIdle()) {
        toast.info('Your cart was cleared', {
          id: 'guest-cart-expired',
          description: 'Guest carts are kept for 1 hour of inactivity. Prices and stock may have changed.'
        });
      } else {
        store.touch();
      }
    };

    void check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  return null;
}
