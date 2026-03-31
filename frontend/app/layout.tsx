import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL('https://don-claudios.vercel.app'),
    title: 'Donclaudio\'s Lechon House',
  description:
    'Donclaudio\'s Lechon House is a premier destination for delicious lechon and traditional Filipino cuisine.',
  icons: {
    icon: [
      {url: '/assets/logo.png', type: 'image/png', sizes: '32x32'}, 
      {url: '/assets/logo.png', type: 'image/png', sizes: '192x192'} 
    ],
    apple: '/assets/logo.png' 
  },
  openGraph: {
    title: 'Donclaudio\'s Lechon House',
    description:
      'Donclaudio\'s Lechon House is a premier destination for delicious lechon and traditional Filipino cuisine.',
    url: 'https://don-claudios.vercel.app/',
    type: 'website',
    images: [
      {
        url: '/assets/logo.png', 
        width: 1200,
        height: 630,
        alt: 'Donclaudio\'s Lechon House Preview'
      }
    ]
  }
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
