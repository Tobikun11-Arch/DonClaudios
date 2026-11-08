'use client';

import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {ThemeProvider} from 'next-themes';

/**
 * Dark mode is an owner-dashboard feature only. Every other area (storefront,
 * customer and cashier dashboards, sign-in) is always light, even when the
 * owner picked "Dark" or "System" in Settings → Customize: those pages were
 * never designed for dark mode.
 *
 * `forcedTheme` only changes what is applied on those routes; the owner's
 * saved choice is kept and comes back as soon as they open the dashboard.
 */
export function AppThemeProvider({children}: {children: ReactNode}) {
  const pathname = usePathname() ?? '';
  const isOwnerArea = pathname.startsWith('/owner');

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      forcedTheme={isOwnerArea ? undefined : 'light'}
    >
      {children}
    </ThemeProvider>
  );
}
