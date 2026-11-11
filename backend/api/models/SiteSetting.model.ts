import mongoose, {Schema} from 'mongoose';

export interface StatItem {
  value: string;
  label: string;
}

export interface ReviewItem {
  rating: number;
  quote: string;
  name: string;
  tag: string;
}

export interface SiteSettingDocument extends mongoose.Document {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    backgroundImage: string;
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
    image: string;
    stats: StatItem[];
  };
  promo: {
    title: string;
    subtitle: string;
  };
  reviews: {
    heading: string;
    subheading: string;
    featured: ReviewItem;
    items: ReviewItem[];
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
  sectionStyles: Record<string, {
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
  }>;
  /** Free delivery by the store's own rider (see config/delivery.ts). */
  freeDelivery?: {
    enabled: boolean;
    minSubtotal: number;
    zone: {lat: number; lng: number}[];
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

const ReviewItemSchema = new Schema<ReviewItem>(
  {
    rating: {type: Number, default: 5},
    quote: {type: String, default: ''},
    name: {type: String, default: ''},
    tag: {type: String, default: ''}
  },
  {_id: false}
);

const SectionStyleSchema = new Schema(
  {
    backgroundColor: {type: String, default: ''},
    textColor: {type: String, default: ''},
    fontFamily: {type: String, default: ''}
  },
  {_id: false}
);

const LatLngSchema = new Schema(
  {
    lat: {type: Number, required: true},
    lng: {type: Number, required: true}
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
      backgroundImage: {type: String, default: '/assets/hero_image.JPG'},
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
      image: {type: String, default: '/assets/ourstory.JPG'},
      stats: {type: [StatItemSchema], default: []}
    },
    promo: {
      title: {type: String, default: 'Special Deals'},
      subtitle: {type: String, default: 'Check out our latest promos and save on your favorite lechon!'}
    },
    reviews: {
      heading: {type: String, default: 'What Our Customers Say'},
      subheading: {type: String, default: 'Real stories from families who celebrated with our lechon'},
      featured: {type: ReviewItemSchema, default: () => ({})},
      items: {type: [ReviewItemSchema], default: []}
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
    },
    sectionStyles: {
      type: Map,
      of: SectionStyleSchema,
      default: () => ({})
    },
    // No defaults here: an unset value means "use DEFAULT_FREE_DELIVERY_SETTINGS",
    // so changing the default in code reaches stores that never edited it.
    freeDelivery: {
      enabled: {type: Boolean},
      minSubtotal: {type: Number, min: 0},
      zone: {type: [LatLngSchema], default: undefined}
    }
  },
  {timestamps: true}
);

export const SiteSettingModel = mongoose.model<SiteSettingDocument>(
  'SiteSetting',
  SiteSettingSchema,
  'site_settings'
);
