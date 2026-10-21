import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'images.unsplash.com'},
      {protocol: 'https', hostname: 'plus.unsplash.com'},
      {protocol: 'https', hostname: 'res.cloudinary.com'}
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {key: 'X-Content-Type-Options', value: 'nosniff'},
          {key: 'X-Frame-Options', value: 'DENY'},
          {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'}
        ]
      },
      {
        source: '/service-worker.js',
        headers: [
          {key: 'Content-Type', value: 'application/javascript; charset=utf-8'},
          {key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate'},
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'"
          }
        ]
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          {key: 'Content-Type', value: 'application/manifest+json; charset=utf-8'},
          {key: 'Cache-Control', value: 'public, max-age=0, must-revalidate'}
        ]
      }
    ]
  }
};

export default nextConfig;