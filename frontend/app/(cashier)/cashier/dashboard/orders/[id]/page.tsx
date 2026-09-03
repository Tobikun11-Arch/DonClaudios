'use client';

import {useParams} from 'next/navigation';
import CashierOrderDetail from '@/features/cashier/orders/components/CashierOrderDetail';

export default function CashierOrderDetailPage() {
  const params = useParams<{id: string}>();
  const orderId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <CashierOrderDetail orderId={orderId} />;
}