'use client';

import {useState} from 'react';
import {PackageSearch} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import OrderTracking from '@/features/order/components/OrderTracking';

export default function TrackOrderPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [submitted, setSubmitted] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setSubmitted(trackingNumber.trim());
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-28 pb-12">
      <div className="w-full max-w-3xl mx-auto px-4 space-y-6">
        <div className="rounded-2xl bg-white shadow p-6">
          <div className="flex items-center gap-3">
            <PackageSearch className="h-6 w-6 text-[#3c5e45]" />
            <h1 className="text-xl font-bold text-gray-900">Track your order</h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Enter your tracking number to view your order status.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
            <Input
              value={trackingNumber}
              onChange={e => setTrackingNumber(e.target.value)}
              placeholder="Tracking number"
              className="flex-1"
            />
            <Button type="submit" className="bg-[#3c5e45]">
              Track
            </Button>
          </form>
        </div>

        {submitted ? (
          <OrderTracking orderId={submitted} variant="guest" />
        ) : null}
      </div>
    </main>
  );
}
