'use client';

import {useState} from 'react';
import Image from 'next/image';
import {Button} from '@/components/ui/button';
import {useStoreStatusQuery} from '@/lib/hooks/useStoreStatus';

const ACK_KEY = 'don_closed_acknowledged';

function readAcknowledged(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(ACK_KEY) === '1';
  } catch {
    return false;
  }
}

function writeAcknowledged() {
  try {
    window.sessionStorage.setItem(ACK_KEY, '1');
  } catch {
    // ignore storage access failures
  }
}

export default function StoreClosedModal() {
  const {data} = useStoreStatusQuery();
  const [acknowledged, setAcknowledged] = useState(readAcknowledged);

  const isClosed = data?.status.isOpen === false;

  const handleBrowse = () => {
    setAcknowledged(true);
    writeAcknowledged();
  };

  if (!data || !isClosed || acknowledged) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      onClick={handleBrowse}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <Image
          src="/assets/don_closed.png"
          alt="Store is currently closed"
          width={600}
          height={600}
          className="mx-auto h-90 w-auto object-contain"
        />

        <Button
          type="button"
          className="mt-6 w-full h-12 rounded-full bg-[#3c5e45] text-white hover:bg-[#3c5e45]"
          onClick={handleBrowse}
        >
          Browse Menu
        </Button>
      </div>
    </div>
  );
}