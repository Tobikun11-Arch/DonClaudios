export type HeroStat = {
  value: string;
  label: string;
};

export type HighlightImage = {
  url: string;
  alt: string;
};

export type AboutStat = {
  value: string;
  label: string;
};

export type Colors = {
  primary: string;
  accent: string;
  muted: string;
  darkGreen: string;
  mediumGreen: string;
  lightGreen: string;
  beige: string;
  red: string;
};

export type SiteSetting = {
  _id: string;
  hero: {
    title: string;
    highlightedWord: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    backgroundImage: string;
    stats: HeroStat[];
  };
  highlights: {
    title: string;
    images: HighlightImage[];
  };
  about: {
    title: string;
    description: string;
    stats: AboutStat[];
  };
  contact: {
    address: string;
    phone: string;
    email: string;
    hours: string;
  };
  colors: Colors;
  createdAt?: string;
  updatedAt?: string;
};

export type GetSettingsResponse = {
  settings: SiteSetting;
};

export type UpdateSettingsResponse = {
  settings: SiteSetting;
};
