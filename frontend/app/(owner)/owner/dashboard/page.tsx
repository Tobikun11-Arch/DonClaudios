'use client';

import {useRouter} from 'next/navigation';
import {useLogout} from '@/lib/hooks/auth/useLogout';

export default function OwnerDashboard() {
  const router = useRouter();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.replace('/sign-in');
  };

  return (
    <div>
      <div>OwnerDashboard</div>
      <button onClick={handleLogout} disabled={logoutMutation.isPending}>
        {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}
