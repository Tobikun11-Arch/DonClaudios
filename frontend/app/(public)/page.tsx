'use client';

import {HeroSection, Highlights, Promo, About, Reviews, Contact} from '@/features/home';
import {useSettingsQuery} from '@/lib/hooks/useSettings';

const EMPTY_STYLE = {backgroundColor: '', textColor: '', fontFamily: ''} as const;

export default function HomePage() {
  const {data: settings} = useSettingsQuery();
  const ss = settings?.sectionStyles;

  return (
    <>
      <HeroSection hero={settings?.hero} colors={settings?.colors} sectionStyle={ss?.hero ?? EMPTY_STYLE} />
      <Highlights highlights={settings?.highlights} colors={settings?.colors} sectionStyle={ss?.highlights ?? EMPTY_STYLE} />
      <Promo promo={settings?.promo} sectionStyle={ss?.promo ?? EMPTY_STYLE} />
      <About about={settings?.about} colors={settings?.colors} sectionStyle={ss?.about ?? EMPTY_STYLE} />
      <Reviews reviews={settings?.reviews} colors={settings?.colors} sectionStyle={ss?.reviews ?? EMPTY_STYLE} />
      <Contact contact={settings?.contact} colors={settings?.colors} sectionStyle={ss?.contact ?? EMPTY_STYLE} />
    </>
  );
}
