'use client';

import Link from 'next/link';
import {HeroSection, Highlights, Promo, About, Reviews, Contact} from '@/features/home';
import {useSettingsQuery} from '@/lib/hooks/useSettings';
import {usePublicReviewsQuery} from '@/lib/hooks/reviews/useReviews';

const EMPTY_STYLE = {backgroundColor: '', textColor: '', fontFamily: ''} as const;

/**
 * Plain statement of what this website is for. Google's OAuth branding review
 * reads the home page to confirm the app's purpose, so keep this public and
 * keep the name matching the "App name" on the Google consent screen.
 */
function SiteIntro() {
  return (
    <section id="about-this-site" className="px-4 py-12 bg-white text-gray-800">
      <div className="container mx-auto max-w-3xl space-y-3 text-center">
        <h2 className="text-2xl font-bold">About this website</h2>
        <p>
          This is the official online ordering website of <strong>DonClaudio&apos;s Lechon House</strong>, a
          lechon restaurant in Tanza, Cavite, Philippines. You can browse our menu, order lechon and Filipino
          dishes for pick-up or delivery, place scheduled pre-orders, pay online, and track your order. No
          account is needed to look around or to order as a guest.
        </p>
        <p>
          Creating an account is optional. You can sign up with your email or with &quot;Continue with
          Google&quot;, which only shares your name, email address and profile picture with us so we can set up
          your account and send you order updates. Read our{' '}
          <Link href="/privacy" className="underline font-medium">Privacy Policy</Link> and{' '}
          <Link href="/terms" className="underline font-medium">Terms &amp; Conditions</Link>.
        </p>
      </div>
    </section>
  );
}

export default function HomePage() {
  const {data: settings} = useSettingsQuery();
  const {data: reviewsData} = usePublicReviewsQuery();
  const ss = settings?.sectionStyles;

  const liveReviews = (reviewsData?.reviews ?? []).map(review => ({
    rating: review.rating,
    quote: review.comment,
    name: review.customerName,
    tag: 'Verified Customer',
    profilePhoto: review.profilePhoto ?? null,
    images: review.images ?? []
  }));

  const reviews =
    settings && liveReviews.length > 0
      ? {
          ...settings.reviews,
          featured: liveReviews[0],
          items: liveReviews.slice(1)
        }
      : settings?.reviews;

  return (
    <>
      <HeroSection hero={settings?.hero} colors={settings?.colors} sectionStyle={ss?.hero ?? EMPTY_STYLE} />
      <Highlights highlights={settings?.highlights} colors={settings?.colors} sectionStyle={ss?.highlights ?? EMPTY_STYLE} />
      <Promo promo={settings?.promo} sectionStyle={ss?.promo ?? EMPTY_STYLE} />
      <About about={settings?.about} colors={settings?.colors} sectionStyle={ss?.about ?? EMPTY_STYLE} />
      <SiteIntro />
      <Reviews reviews={reviews} colors={settings?.colors} sectionStyle={ss?.reviews ?? EMPTY_STYLE} />
      <Contact contact={settings?.contact} colors={settings?.colors} sectionStyle={ss?.contact ?? EMPTY_STYLE} />
    </>
  );
}
