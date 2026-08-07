import mongoose, {Schema} from 'mongoose';

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

export interface SiteSettingDocument extends mongoose.Document {
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
}

const HeroStatSchema = new Schema<HeroStat>(
  {
    value: {type: String, required: true},
    label: {type: String, required: true}
  },
  {_id: false}
);

const HighlightImageSchema = new Schema<HighlightImage>(
  {
    url: {type: String, required: true},
    alt: {type: String, required: true}
  },
  {_id: false}
);

const AboutStatSchema = new Schema<AboutStat>(
  {
    value: {type: String, required: true},
    label: {type: String, required: true}
  },
  {_id: false}
);

const ColorsSchema = new Schema<Colors>(
  {
    primary: {type: String, default: '#3c5e45'},
    accent: {type: String, default: '#fbd897'},
    muted: {type: String, default: '#a4bbab'},
    darkGreen: {type: String, default: '#2d4a35'},
    mediumGreen: {type: String, default: '#4a7c59'},
    lightGreen: {type: String, default: '#b8d4c0'},
    beige: {type: String, default: '#e8dcc4'},
    red: {type: String, default: '#c30010'}
  },
  {_id: false}
);

const SiteSettingSchema = new Schema<SiteSettingDocument>(
  {
    hero: {
      title: {type: String, default: 'Authentic\nFilipino'},
      highlightedWord: {type: String, default: 'Lechon'},
      subtitle: {
        type: String,
        default:
          'Slow-roasted to perfection with crispy golden skin and juicy, tender meat.'
      },
      ctaText: {type: String, default: 'Place Your Order'},
      ctaLink: {type: String, default: '/order'},
      backgroundImage: {type: String, default: '/assets/hero_image.JPG'},
      stats: {type: [HeroStatSchema], default: []}
    },
    highlights: {
      title: {type: String, default: 'Visit Our DonClaudio\'s Lechon House'},
      images: {type: [HighlightImageSchema], default: []}
    },
    about: {
      title: {type: String, default: 'Our Story'},
      description: {
        type: String,
        default:
          'DonClaudio\'s Lechon House has been serving Tanza, Cavite with authentic Filipino lechon for years.'
      },
      stats: {type: [AboutStatSchema], default: []}
    },
    contact: {
      address: {type: String, default: 'Jasmine St. De Roman, Brgy.Daang Amaya 1, Tanza, Philippines, 4108'},
      phone: {type: String, default: '+63 915 5321 169'},
      email: {type: String, default: 'support@donclaudio.com'},
      hours: {type: String, default: 'Tue - Sun: 10:00 AM - 10:00 PM'}
    },
    colors: {type: ColorsSchema, default: () => ({})}
  },
  {timestamps: true}
);

export const SiteSettingModel = mongoose.model<SiteSettingDocument>(
  'SiteSetting',
  SiteSettingSchema,
  'sitesettings'
);
