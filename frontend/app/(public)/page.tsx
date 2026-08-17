'use client';

import {HeroSection, Highlights, Promo, About, Contact} from '@/features/home';
import {useSettingsQuery} from '@/lib/hooks/useSettings';

export default function HomePage() {
  const {data: settings} = useSettingsQuery();

  return (
    <>
      <HeroSection hero={settings?.hero} />
      <Highlights highlights={settings?.highlights} />
      <Promo />
      <About about={settings?.about} />
      <Contact contact={settings?.contact} />
    </>
  );
}
