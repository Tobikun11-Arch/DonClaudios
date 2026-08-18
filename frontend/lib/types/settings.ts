export interface StatItem {
  value: string;
  label: string;
}

export type HeroStat = StatItem;
export type AboutStat = StatItem;

export interface HighlightImage {
  url: string;
  alt: string;
}

export interface HeroSection {
  title: string;
  highlightedWord: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage: string;
  stats: StatItem[];
}

export interface HighlightsSection {
  title: string;
  subtitle: string;
  images: HighlightImage[];
}

export interface AboutSection {
  title: string;
  description: string;
  stats: StatItem[];
}

export interface ContactSection {
  address: string;
  phones: string[];
  email: string;
  hours: string;
}

export interface FooterSection {
  brandName: string;
  description: string;
  phones: string[];
  email: string;
  address: string;
  hours: string;
}

export interface Colors {
  primary: string;
  accent: string;
  muted: string;
  darkGreen: string;
  mediumGreen: string;
  lightGreen: string;
  beige: string;
  red: string;
}

export interface SiteSetting {
  hero: HeroSection;
  highlights: HighlightsSection;
  about: AboutSection;
  contact: ContactSection;
  footer: FooterSection;
  colors: Colors;
}

export interface GetSettingsResponse {
  settings: SiteSetting;
}

export interface UpdateSettingsResponse {
  settings: SiteSetting;
}
