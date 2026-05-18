'use client';

import Image from 'next/image';
import {useParams, useRouter} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {useLocationStore} from '@/app/store/locationStore';

export default function CustomerOrderConfirmationPage() {
  const params = useParams<{id: string}>();
  const router = useRouter();
  const location = useLocationStore(s => s.location);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2">
            <p className="text-2xl font-extrabold text-gray-900">
              Confirming your order
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Waiting for the store to confirm your order.
            </p>

            <div className="mt-8 rounded-2xl bg-white shadow p-6">
              <p className="text-sm font-bold text-gray-900">Order Details</p>
              <p className="text-xs text-gray-500 mt-2">
                Order ID: {params?.id ?? ''}
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs text-gray-500">From</p>
                  <p className="text-sm font-semibold text-gray-900">
                    DonClaudio&apos;s Lechon House
                  </p>
                  <p className="text-sm text-gray-600">
                    Jasmine St. De Roman Brgy.Daang Amaya 1, Tanza, Cavite,
                    Philippines 4108
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">Deliver to</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {location?.address ?? 'No saved location'}
                  </p>
                </div>

                <div className="pt-4 border-t flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => router.push('/customer/dashboard')}
                  >
                    Add more items
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white shadow p-6 grid place-items-center">
              <div className="relative w-56 h-56 rounded-full bg-[#3c5e45]/10 overflow-hidden">
                <Image
                  src="/assets/logo.png"
                  alt="DonClaudio's"
                  fill
                  className="object-contain p-10"
                />
              </div>
              <p className="mt-5 text-sm font-semibold text-gray-900">
                DonClaudio&apos;s Lechon House
              </p>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Thank you! We&apos;re preparing to confirm your order.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
