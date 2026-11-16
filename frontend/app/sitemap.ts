import type {MetadataRoute} from 'next';

const SITE_URL = 'https://www.donclaudios.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1},
    {url: `${SITE_URL}/order`, lastModified, changeFrequency: 'daily', priority: 0.9},
    {url: `${SITE_URL}/track`, lastModified, changeFrequency: 'monthly', priority: 0.5},
    {url: `${SITE_URL}/return-policy`, lastModified, changeFrequency: 'yearly', priority: 0.3},
    {url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3},
    {url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3}
  ];
}
