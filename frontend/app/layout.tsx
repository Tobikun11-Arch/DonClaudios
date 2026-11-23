import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono, Inter} from 'next/font/google';
import './globals.css';
import {cn} from '@/lib/utils';
import {ReactQueryProvider} from '@/lib/provider/ReactQueryProvider';
import {AppThemeProvider} from '@/components/theme/AppThemeProvider';
import {ServiceWorkerRegistrar} from '@/components/pwa/ServiceWorkerRegistrar';
import {InstallPrompt} from '@/components/pwa/InstallPrompt';
import {AcquisitionTracker} from '@/components/AcquisitionTracker';

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

export const viewport: Viewport = {
  themeColor: '#b91c1c',
  width: 'device-width',
  initialScale: 1,
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.donclaudios.com'),
  title: "DonClaudio's Lechon House | Lechon in Tanza, Cavite",
  description:
    "DonClaudio's Lechon House in Tanza, Cavite – crispy, flavorful lechon and traditional Filipino dishes. Order online for pick-up or delivery, or reserve a table. Open Tue–Sun, 10 AM–10 PM.",
  appleWebApp: {
    capable: true,
    title: "DonClaudio's",
    statusBarStyle: 'default',
  },
  icons: {
    // Google Search shows a favicon only if it is square and a multiple of
    // 48px, so the 48/96 PNGs come first; /favicon.ico is the crawler fallback.
    icon: [
      {url: '/favicon.ico', sizes: '48x48'},
      {url: '/icons/favicon-48x48.png', type: 'image/png', sizes: '48x48'},
      {url: '/icons/favicon-96x96.png', type: 'image/png', sizes: '96x96'},
      {url: '/icons/favicon-32x32.png', type: 'image/png', sizes: '32x32'},
      {url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192'},
      {url: '/icons/icon-512x512.png', type: 'image/png', sizes: '512x512'}
    ],
    apple: '/icons/apple-touch-icon.png'
  },
  openGraph: {
    title: "DonClaudio's Lechon House | Lechon in Tanza, Cavite",
    description:
      "Crispy, flavorful lechon and traditional Filipino dishes in Tanza, Cavite. Order online for pick-up or delivery, or reserve a table.",
    url: 'https://www.donclaudios.com/',
    type: 'website',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: "DonClaudio's Lechon House Preview"
      }
    ]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        'h-full antialiased overflow-x-clip',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        inter.variable
      )}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject
          data-gr-* attributes into <body> before React hydrates. This suppresses
          attribute mismatch warnings on this node only, not descendants. */}
      <body
        className="min-h-full flex flex-col overflow-x-clip"
        suppressHydrationWarning
      >
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <ServiceWorkerRegistrar />
        <AcquisitionTracker />
        <AppThemeProvider>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </AppThemeProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
