'use client';

import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {ThemeProvider} from 'next-themes';

/**
 * Dark mode exists in the owner dashboard (`/owner`, Settings → Customize)
 * and the customer dashboard (`/customer`, Profile → Appearance). Both read
 * the same saved choice for this browser: owners and customers normally use
 * different devices, and one provider that never remounts keeps next-themes'
 * no-flash script server-rendered only.
 *
 * Every other area (storefront, cashier dashboard, sign-in) is always light:
 * those pages were never designed for dark mode. `forcedTheme` only changes
 * what is applied there; the saved choice is kept and comes back as soon as
 * the user opens a dashboard again.
 */
export function AppThemeProvider({children}: {children: ReactNode}) {
  const pathname = usePathname() ?? '';
  const supportsDark =
    pathname.startsWith('/owner') || pathname.startsWith('/customer');

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      forcedTheme={supportsDark ? undefined : 'light'}
    >
      {children}
    </ThemeProvider>
  );
}
