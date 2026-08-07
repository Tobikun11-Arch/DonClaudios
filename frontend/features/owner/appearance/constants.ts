import type {SiteSetting} from '@/lib/types/settings';

export const DEFAULT_SETTINGS: Omit<SiteSetting, '_id' | 'createdAt' | 'updatedAt'> = {
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
    title: 'Visit Our DonClaudio\'s Lechon House',
    images: []
  },
  about: {
    title: 'Our Story',
    description:
      'DonClaudio\'s Lechon House has been serving Tanza, Cavite with authentic Filipino lechon for years. We\'re passionate about bringing families together with food that celebrates our rich culinary heritage.',
    stats: [
      {value: '100%', label: 'Fresh & Quality'},
      {value: 'Daily', label: 'Roasted Fresh'}
    ]
  },
  contact: {
    address: 'Jasmine St. De Roman\nBrgy.Daang Amaya 1\nTanza, Philippines, 4108',
    phone: '+63 915 5321 169',
    email: 'support@donclaudio.com',
    hours: 'Tue - Sun: 10:00 AM - 10:00 PM'
  },
  colors: {
    primary: '#3c5e45',
    accent: '#fbd897',
    muted: '#a4bbab',
    darkGreen: '#2d4a35',
    mediumGreen: '#4a7c59',
    lightGreen: '#b8d4c0',
    beige: '#e8dcc4',
    red: '#c30010'
  }
};
