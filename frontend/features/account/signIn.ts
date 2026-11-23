import type {QueryClient} from '@tanstack/react-query';
import {meQueryKey} from '@/lib/hooks/auth/useMeQuery';
import type {SignedInUser} from '@/lib/api/accountSecurityApi';

/** Where each kind of account lands after signing in. */
export function dashboardFor(type: SignedInUser['type']) {
  if (type === 'admin') return '/owner/dashboard';
  if (type === 'cashier') return '/cashier/dashboard';
  return '/customer/dashboard';
}

/**
 * Shared by password, Google and two-step sign-in: drop any stale cached
 * /auth/me (e.g. a previous 401) so the dashboard guard sees the new session.
 */
export function finishSignIn(
  user: SignedInUser,
  router: {push: (href: string) => void},
  queryClient: QueryClient
) {
  queryClient.removeQueries({queryKey: meQueryKey});
  router.push(dashboardFor(user.type));
}
