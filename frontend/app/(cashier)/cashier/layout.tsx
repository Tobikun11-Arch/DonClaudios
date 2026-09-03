'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useMeQuery} from '@/lib/hooks/auth/useMeQuery';
import {getDashboardPath} from '@/lib/auth/redirects';
import Loading from '@/app/loading';

export default function CashierLayout({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const {data, isLoading, isError, isSuccess} = useMeQuery();

  useEffect(() => {
    if (isError) {
      router.replace('/sign-in');
      return;
    }

    if (!isSuccess) return;

    if (data.user.type !== 'cashier') {
      router.replace(getDashboardPath(data.user.type));
    }
  }, [data, isError, isSuccess, router]);

  if (isLoading) return <Loading/>;

  return <>{children}</>;
}
