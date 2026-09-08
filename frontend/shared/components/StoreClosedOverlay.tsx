'use client';

import Image from 'next/image';
import {Clock, DoorClosed} from 'lucide-react';
import type {StoreStatus} from '@/lib/api/storeStatusApi';

export default function StoreClosedOverlay({
  status
}: {
  status: StoreStatus;
}) {
  const isManual = status.isManuallyClosed;

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <DoorClosed className="h-8 w-8 text-[#c30010]" />
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900">
          We&apos;re Currently Closed
        </h1>

        <p className="mt-3 text-sm text-gray-500">
          {isManual
            ? status.manualCloseReason || 'Temporarily closed by management.'
            : status.reason || 'Store hours have ended for today.'}
        </p>

        <div className="mt-6 rounded-2xl bg-gray-50 px-5 py-4">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#2d4a35]">
            <Clock className="h-4 w-4" />
            Ordering is unavailable
          </div>
          <p className="mt-1.5 text-sm text-gray-500">
            {status.reopenMessage}
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <Image
            src="/assets/logo.png"
            alt="DonClaudio's Lechon House"
            width={80}
            height={80}
            className="rounded-xl object-cover opacity-90"
          />
        </div>
      </div>
    </div>
  );
}