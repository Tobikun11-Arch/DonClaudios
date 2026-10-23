import type {Metadata, Viewport} from 'next';
import {Geist, Geist_Mono, Inter} from 'next/font/google';
import './globals.css';
import {cn} from '@/lib/utils';
import {ReactQueryProvider} from '@/lib/provider/ReactQueryProvider';
import {ThemeProvider} from 'next-themes';
import {ServiceWorkerRegistrar} from '@/components/pwa/ServiceWorkerRegistrar';
import {InstallPrompt} from '@/components/pwa/InstallPrompt';

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
  metadataBase: new URL('https://don-claudios.vercel.app'),
  title: "Donclaudio's Lechon House",
  description:
    "Donclaudio's Lechon House is a premier destination for delicious lechon and traditional Filipino cuisine.",
  appleWebApp: {
    capable: true,
    title: "DonClaudio's",
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {url: '/icons/favicon-32x32.png', type: 'image/png', sizes: '32x32'},
      {url: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192'},
      {url: '/icons/icon-512x512.png', type: 'image/png', sizes: '512x512'}
    ],
    apple: '/icons/apple-touch-icon.png'
  },
  openGraph: {
    title: "Donclaudio's Lechon House",
    description:
      "Donclaudio's Lechon House is a premier destination for delicious lechon and traditional Filipino cuisine.",
    url: 'https://don-claudios.vercel.app/',
    type: 'website',
    images: [
      {
        url: '/assets/logo.png',
        width: 1200,
        height: 630,
        alt: "Donclaudio's Lechon House Preview"
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
        'h-full antialiased overflow-x-hidden',
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
        className="min-h-full flex flex-col overflow-x-hidden"
        suppressHydrationWarning
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <ServiceWorkerRegistrar />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ReactQueryProvider>{children}</ReactQueryProvider>
        </ThemeProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
