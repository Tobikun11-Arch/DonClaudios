'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useQueryClient} from '@tanstack/react-query';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {getDashboardPath} from '@/lib/auth/redirects';
import {useCartStore} from '@/app/store/cartStore';
import {transferGuestCartToAccount} from '@/lib/cart/transferGuestCart';
import Loading from '../loading';

export default function CustomerLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {data, isLoading, isError, isSuccess} = useMeQuery();

  const isRedirecting = isError || (isSuccess && data.user.type !== 'customer');

  useEffect(() => {
    if (isError) {
      router.replace('/sign-in');
      return;
    }

    if (!isSuccess) return;

    if (data.user.type !== 'customer') {
      router.replace(getDashboardPath(data.user.type));
      return;
    }

    if (useCartStore.getState().items.length > 0) {
      void transferGuestCartToAccount(queryClient);
    }
  }, [data, isError, isSuccess, queryClient, router]);

  if (isLoading || isRedirecting) return <Loading />;

  return <>{children}</>;
}
