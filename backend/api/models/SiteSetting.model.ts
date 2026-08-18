import mongoose, {Schema} from 'mongoose';

export interface StatItem {
  value: string;
  label: string;
}

export interface SiteSettingDocument extends mongoose.Document {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    stats: StatItem[];
  };
  highlights: {
    title: string;
    subtitle: string;
    images: {url: string; alt: string}[];
  };
  about: {
    title: string;
    description: string;
    stats: StatItem[];
  };
  contact: {
    address: string;
    phones: string[];
    email: string;
    hours: string;
  };
  footer: {
    brandName: string;
    description: string;
    phones: string[];
    email: string;
    address: string;
    hours: string;
  };
  colors: {
    primary: string;
    accent: string;
    textColor: string;
    backgroundColor: string;
  };
}

const StatItemSchema = new Schema<StatItem>(
  {
    value: {type: String, required: true},
    label: {type: String, required: true}
  },
  {_id: false}
);

const HighlightImageSchema = new Schema(
  {
    url: {type: String, default: ''},
    alt: {type: String, default: ''}
  },
  {_id: false}
);

const SiteSettingSchema = new Schema<SiteSettingDocument>(
  {
    hero: {
      title: {type: String, default: ''},
      subtitle: {type: String, default: ''},
      ctaText: {type: String, default: ''},
      ctaLink: {type: String, default: '/order'},
      stats: {type: [StatItemSchema], default: []}
    },
    highlights: {
      title: {type: String, default: ''},
      subtitle: {type: String, default: ''},
      images: {type: [HighlightImageSchema], default: []}
    },
    about: {
      title: {type: String, default: ''},
      description: {type: String, default: ''},
      stats: {type: [StatItemSchema], default: []}
    },
    contact: {
      address: {type: String, default: ''},
      phones: {type: [String], default: []},
      email: {type: String, default: ''},
      hours: {type: String, default: ''}
    },
    footer: {
      brandName: {type: String, default: ''},
      description: {type: String, default: ''},
      phones: {type: [String], default: []},
      email: {type: String, default: ''},
      address: {type: String, default: ''},
      hours: {type: String, default: ''}
    },
    colors: {
      primary: {type: String, default: '#3c5e45'},
      accent: {type: String, default: '#fbd897'},
      textColor: {type: String, default: '#3c5e45'},
      backgroundColor: {type: String, default: '#ffffff'}
    }
  },
  {timestamps: true}
);

export const SiteSettingModel = mongoose.model<SiteSettingDocument>(
  'SiteSetting',
  SiteSettingSchema,
  'site_settings'
);
