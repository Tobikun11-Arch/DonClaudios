'use client';

import {HeroSection, Highlights, Promo, About, Reviews, Contact} from '@/features/home';
import {useSettingsQuery} from '@/lib/hooks/useSettings';

export default function HomePage() {
  const {data: settings} = useSettingsQuery();

  return (
    <>
      <HeroSection hero={settings?.hero} colors={settings?.colors} />
      <Highlights highlights={settings?.highlights} colors={settings?.colors} />
      <Promo promo={settings?.promo} />
      <About about={settings?.about} colors={settings?.colors} />
      <Reviews reviews={settings?.reviews} colors={settings?.colors} />
      <Contact contact={settings?.contact} colors={settings?.colors} />
    </>
  );
}
