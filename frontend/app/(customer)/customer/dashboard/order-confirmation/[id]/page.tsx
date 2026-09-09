'use client';

import {useParams} from 'next/navigation';
import OrderTracking from '@/features/order/components/OrderTracking';

export default function CustomerOrderConfirmationPage() {
  const params = useParams<{id: string}>();
  const orderId = params?.id ?? '';

  return <OrderTracking key={orderId} orderId={orderId} variant="customer" />;
}