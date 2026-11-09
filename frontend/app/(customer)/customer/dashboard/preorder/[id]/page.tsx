'use client';

import {useParams} from 'next/navigation';
import PreOrderCheckout from '@/features/preorders/components/PreOrderCheckout';

export default function CustomerPreOrderPage() {
  const params = useParams<{id: string}>();
  const id = params?.id ?? '';
  return <PreOrderCheckout key={id} eventId={id} />;
}
