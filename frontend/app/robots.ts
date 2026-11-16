import type {MetadataRoute} from 'next';

const SITE_URL = 'https://www.donclaudios.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private dashboards, auth flows and per-order pages have no search value.
      disallow: [
        '/api/',
        '/owner',
        '/cashier',
        '/customer',
        '/checkout',
        '/order-confirmation',
        '/order-history',
        '/sign-in',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
        '/verify-email',
        '/verify-phone'
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
