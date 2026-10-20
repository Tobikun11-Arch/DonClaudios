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
  image: string;
  stats: StatItem[];
}

export interface PromoSection {
  title: string;
  subtitle: string;
}

export interface ReviewItem {
  rating: number;
  quote: string;
  name: string;
  tag: string;
  profilePhoto?: string | null;
  images?: {url: string; alt?: string}[];
}

export interface ReviewsSection {
  heading: string;
  subheading: string;
  featured: ReviewItem;
  items: ReviewItem[];
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
  backgroundColor: string;
}

export interface SectionStyle {
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

/** MANUAL PAYMENT flow: instructions shown after the cashier confirms. */
export interface PaymentChannel {
  id: string;
  name: string;
  image: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export interface PaymentSection {
  image: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  channels?: PaymentChannel[];
  activeChannelId?: string;
}

export type SectionId = 'hero' | 'highlights' | 'promo' | 'about' | 'reviews' | 'contact';

export type SectionStyles = Record<SectionId, SectionStyle>;

export interface SiteSetting {
  // Public-facing brand identity (sourced from the admin profile).
  brandName?: string;
  brandLogo?: string;
  hero: HeroSection;
  highlights: HighlightsSection;
  promo: PromoSection;
  about: AboutSection;
  reviews: ReviewsSection;
  contact: ContactSection;
  footer: FooterSection;
  colors: Colors;
  sectionStyles: SectionStyles;
  /** Optional because rows created before this feature won't have it. */
  payment?: PaymentSection;
}

export interface GetSettingsResponse {
  settings: SiteSetting;
}

export interface UpdateSettingsResponse {
  settings: SiteSetting;
}
