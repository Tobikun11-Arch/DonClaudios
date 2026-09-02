import type {SiteSetting} from '@/lib/types/settings';

export const DEFAULT_SETTINGS: SiteSetting = {
  hero: {
    title: 'Authentic\nFilipino',
    highlightedWord: 'Lechon',
    subtitle:
      'Slow-roasted to perfection with crispy golden skin and juicy, tender meat. Every celebration deserves the best.',
    ctaText: 'Place Your Order',
    ctaLink: '/order',
    backgroundImage: '/assets/hero_image.JPG',
    stats: [
      {value: '1000+', label: 'Happy Customers'},
      {value: 'Daily', label: 'Fresh Lechon'},
      {value: '10 Yrs', label: 'Experience'}
    ]
  },
  highlights: {
    title: "Visit Our DonClaudio's Lechon House",
    subtitle:
      'Located in the heart of Tanza, Cavite. Come experience our warm hospitality and taste the tradition.',
    images: []
  },
  promo: {
    title: 'Special Deals',
    subtitle: 'Check out our latest promos and save on your favorite lechon!'
  },
  about: {
    title: 'Our Story',
    image: '/assets/ourstory.JPG',
    description:
      "DonClaudio's Lechon House has been serving Tanza, Cavite with authentic Filipino lechon for years. We're passionate about bringing families together with food that celebrates our rich culinary heritage. Every lechon is carefully prepared using time-honored recipes and slow-roasted over open flames to achieve that perfect balance of crispy skin and succulent meat. We source only the finest ingredients because your celebrations deserve nothing less.",
    stats: [
      {value: '100%', label: 'Fresh & Quality'},
      {value: 'Daily', label: 'Roasted Fresh'}
    ]
  },
  reviews: {
    heading: 'What Our Customers Say',
    subheading: 'Real stories from families who celebrated with our lechon',
    featured: {
      rating: 5,
      quote:
        'Best lechon in Tanza! The skin was perfectly crispy and the meat was so tender. Our whole family loved it.',
      name: 'Maria S.',
      tag: 'Tanza, Cavite'
    },
    items: [
      {
        rating: 5,
        quote:
          'Ordered for our fiesta, everyone asked where we got it. Will definitely order again!',
        name: 'Jun D.',
        tag: 'Regular Customer'
      },
      {
        rating: 5,
        quote:
          "Crispy skin, juicy meat — the best lechon we've ever had. Highly recommended!",
        name: 'Ana R.',
        tag: 'Fiesta Order'
      },
      {
        rating: 5,
        quote:
          'We order every Christmas. Always consistent quality and the staff are so friendly.',
        name: 'Carlo M.',
        tag: 'Christmas Order'
      },
      {
        rating: 5,
        quote:
          'First time trying it and I was amazed. The flavor is authentic and the portion was generous.',
        name: 'Liza P.',
        tag: 'First-Time Customer'
      }
    ]
  },
  contact: {
    address:
      'Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Philippines, 4108',
    phones: ['+63 915 5321 169', '+63 939 2587 229'],
    email: 'support@donclaudio.com',
    hours: 'Tue - Sun, 10:00 AM - 10:00 PM'
  },
  footer: {
    brandName: "DonClaudio's Lechon House",
    description:
      'The place of extraordinary taste of Lechon and great food \u2014 DonClaudio\u2019s!',
    phones: ['09155321169', '09392587229'],
    email: 'lcnpau@yahoo.com',
    address:
      'Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite, Philippines 4108',
    hours: 'Open: 10:00 AM - 10:00 PM (Tue-Sun)'
  },
  colors: {
    primary: '#3c5e45',
    accent: '#fbd897',
    muted: '#a4bbab',
    darkGreen: '#2d4a35',
    mediumGreen: '#3c5e45',
    lightGreen: '#a4bbab',
    beige: '#f5f0e8',
    red: '#c0392b',
    backgroundColor: '#ffffff'
  },
  sectionStyles: {
    hero: {backgroundColor: '', textColor: '', fontFamily: ''},
    highlights: {backgroundColor: '', textColor: '', fontFamily: ''},
    promo: {backgroundColor: '', textColor: '', fontFamily: ''},
    about: {backgroundColor: '', textColor: '', fontFamily: ''},
    reviews: {backgroundColor: '', textColor: '', fontFamily: ''},
    contact: {backgroundColor: '', textColor: '', fontFamily: ''}
  }
};
