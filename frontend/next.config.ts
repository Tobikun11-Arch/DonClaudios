import type {NextConfig} from 'next';

// Backend API base. Used only by the Next.js server-side rewrite below to proxy
// /api/* to the real backend. The browser itself always calls the same-origin
// /api so auth cookies stay first-party (fixes iOS/Safari ITP cookie blocking).
// Trim defensively: env vars pasted into Vercel often carry a trailing newline,
// which would otherwise leak into the rewrite destination as "%0A" and 404.
const backendApiUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api'
)
  .trim()
  .replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [{source: '/api/:path*', destination: `${backendApiUrl}/:path*`}];
  },
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