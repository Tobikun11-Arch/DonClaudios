'use client';

import {HeroSection, Highlights, Promo, About, Contact} from '@/features/home';
import {useSettingsQuery} from '@/lib/hooks/useSettings';
import {DEFAULT_SETTINGS} from '@/features/owner/appearance/constants';

export default function HomePage() {
  const settingsQuery = useSettingsQuery();
  const settings = settingsQuery.data?.settings;
  const isLoading = settingsQuery.isLoading;

  const hero = settings?.hero ?? DEFAULT_SETTINGS.hero;
  const highlights = settings?.highlights ?? DEFAULT_SETTINGS.highlights;
  const about = settings?.about ?? DEFAULT_SETTINGS.about;
  const contact = settings?.contact ?? DEFAULT_SETTINGS.contact;

  return (
    <>
      <HeroSection
        title={hero.title}
        highlightedWord={hero.highlightedWord}
        subtitle={hero.subtitle}
        ctaText={hero.ctaText}
        ctaLink={hero.ctaLink}
        backgroundImage={hero.backgroundImage}
        stats={hero.stats}
        isLoading={isLoading}
      />
      <Highlights
        title={highlights.title}
        images={highlights.images}
        isLoading={isLoading}
      />
      <Promo />
      <About
        title={about.title}
        description={about.description}
        stats={about.stats}
        isLoading={isLoading}
      />
      <Contact
        address={contact.address}
        phone={contact.phone}
        email={contact.email}
        hours={contact.hours}
        isLoading={isLoading}
      />
    </>
  );
}
