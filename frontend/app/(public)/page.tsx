'use client';

import {HeroSection, Highlights, Promo, About, Reviews, Contact} from '@/features/home';
import {useSettingsQuery} from '@/lib/hooks/useSettings';

export default function HomePage() {
  const {data: settings} = useSettingsQuery();

  return (
    <>
      <HeroSection hero={settings?.hero} colors={settings?.colors} />
      <Highlights highlights={settings?.highlights} colors={settings?.colors} />
      <Promo />
      <About about={settings?.about} colors={settings?.colors} />
      <Reviews colors={settings?.colors} />
      <Contact contact={settings?.contact} colors={settings?.colors} />
    </>
  );
}
