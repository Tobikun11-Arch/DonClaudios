import type {SiteSetting} from '@/lib/types/settings';

export const DEFAULT_SETTINGS: SiteSetting = {
  hero: {
    title: 'Authentic Filipino Lechon',
    subtitle:
      'Slow-roasted to perfection with crispy golden skin and juicy, tender meat. Every celebration deserves the best.',
    ctaText: 'Place Your Order',
    ctaLink: '/order',
    stats: [
      {value: '1000+', label: 'Happy Customers'},
      {value: 'Daily', label: 'Fresh Lechon'},
      {value: '10 Yrs', label: 'Experience'}
    ]
  },
  highlights: {
    title: "Visit Our DonClaudio's Lechon House",
    subtitle:
      'Located in the heart of Tanza, Cavite. Come experience our warm hospitality and taste the tradition.'
  },
  about: {
    title: 'Our Story',
    description:
      "DonClaudio's Lechon House has been serving Tanza, Cavite with authentic Filipino lechon for years. We're passionate about bringing families together with food that celebrates our rich culinary heritage. Every lechon is carefully prepared using time-honored recipes and slow-roasted over open flames to achieve that perfect balance of crispy skin and succulent meat. We source only the finest ingredients because your celebrations deserve nothing less.",
    stats: [
      {value: '100%', label: 'Fresh & Quality'},
      {value: 'Daily', label: 'Roasted Fresh'}
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
    textColor: '#3c5e45',
    backgroundColor: '#ffffff'
  }
};
