import React from 'react';
import Header from '@/shared/components/layout/Header';
import ConnectedFooter from '@/shared/components/layout/ConnectedFooter';
import CartDrawer from '@/shared/components/cart/CartDrawer';
import GuestCartExpiry from '@/shared/components/cart/GuestCartExpiry';
import SupportChatBubble from '@/features/support/components/SupportChatBubble';
import {Toaster} from '@/components/ui/sonner';
import {UxMotionScope} from '@/shared/motion/UxMotionScope';

// Restaurant structured data (schema.org) so Google can show address, phone
// and hours in search and connect the site to the Google Business Profile.
const restaurantJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: "DonClaudio's Lechon House",
  url: 'https://www.donclaudios.com/',
  image: 'https://www.donclaudios.com/assets/logo.png',
  logo: 'https://www.donclaudios.com/assets/logo.png',
  description:
    "DonClaudio's Lechon House in Tanza, Cavite serves crispy, flavorful lechon and traditional Filipino dishes. Order online for pick-up or delivery, or reserve a table.",
  servesCuisine: ['Filipino', 'Lechon'],
  telephone: '+63-915-532-1169',
  contactPoint: [
    {'@type': 'ContactPoint', telephone: '+63-915-532-1169', contactType: 'customer service'},
    {'@type': 'ContactPoint', telephone: '+63-939-258-7229', contactType: 'customer service'}
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Jasmine St., De Roman, Brgy. Daang Amaya 1',
    addressLocality: 'Tanza',
    addressRegion: 'Cavite',
    postalCode: '4108',
    addressCountry: 'PH'
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00',
      closes: '22:00'
    }
  ],
  hasMenu: 'https://www.donclaudios.com/order',
  acceptsReservations: true
};

// WebSite structured data tells Google the site's name for the search result
// header (instead of the bare "donclaudios.com").
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: "DonClaudio's Lechon House",
  alternateName: ["DonClaudio's", 'Don Claudios'],
  url: 'https://www.donclaudios.com/'
};

export default function PublicLayout({children}: {children: React.ReactNode}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(restaurantJsonLd)}}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(websiteJsonLd)}}
      />
      <UxMotionScope exceptHome />
      <Header />
      <main className="pt-12">{children}</main>
      <CartDrawer />
      <GuestCartExpiry />
      <ConnectedFooter />
      <SupportChatBubble />
      <Toaster />
    </>
  );
}
