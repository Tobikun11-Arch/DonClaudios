export interface StatItem {
  value: string;
  label: string;
}

export interface HeroSection {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  stats: StatItem[];
}

export interface HighlightsSection {
  title: string;
  subtitle: string;
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
  textColor: string;
  backgroundColor: string;
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
