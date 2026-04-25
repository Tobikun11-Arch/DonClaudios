export type UserType = 'admin' | 'cashier' | 'customer';

export function getDashboardPath(userType: UserType) {
  if (userType === 'admin') return '/owner/dashboard';
  if (userType === 'cashier') return '/cashier/dashboard';
  return '/customer/dashboard';
}
