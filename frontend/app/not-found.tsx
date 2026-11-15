'use client';

import Link from 'next/link';
import {useBrand} from '@/lib/hooks/useBrand';
import {BrandLogo} from '@/shared/components/BrandLogo';

export default function NotFound() {
  const brand = useBrand();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center">
      <BrandLogo
        src={brand.logo}
        alt={brand.name + ' Logo'}
        width={120}
        height={120}
        className="mb-6"
      />
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Page Not Found</h2>
      <p className="text-gray-600 mb-6">
        Sorry, we couldn&apos;t find the resource you requested.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        Return Home
      </Link>
    </div>
  );
}