export interface StatItem {
  value: string;
  label: string;
}

export type HeroStat = StatItem;
export type AboutStat = StatItem;

export interface NotificationPreferences {
  account?: {
    'New login'?: boolean;
    'Password change'?: boolean;
  };
  reports?: {
    'Daily sales summary'?: boolean;
    'High cancellation rate'?: boolean;
    'Kitchen prep times missing'?: boolean;
  };
  customers?: {
    'New reviews'?: boolean;
    'Flagged reviews'?: boolean;
    'Customer replies'?: boolean;
    'New chat messages'?: boolean;
    'New sign-ups'?: boolean;
  };
  inventory?: {
    'Low stock alerts'?: boolean;
    'Out of stock'?: boolean;
    'Spoilage / large adjustments'?: boolean;
  };
  preorders?: {
    'Pre-order batch almost full'?: boolean;
    'Pre-order batch sold out'?: boolean;
    'Pre-order window closed'?: boolean;
  };
}

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
  /** Owner/cashier dashboard colors; '' means the default green. */
  dashboardTheme?: DashboardTheme;
}

export interface DashboardTheme {
  sidebarBg: string;
  accent: string;
}

export interface GetSettingsResponse {
  settings: SiteSetting;
}

export interface UpdateSettingsResponse {
  settings: SiteSetting;
}
