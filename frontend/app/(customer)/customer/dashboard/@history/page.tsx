'use client';

import OrderHistorySection from '@/features/order/components/OrderHistorySection';
import {useMyOrdersQuery} from '@/lib/hooks/orders/useCustomerOrder';

export default function HistorySlot() {
  const ordersQuery = useMyOrdersQuery();

  return (
    <div className="w-full max-w-6xl mx-auto">
      <OrderHistorySection
        orders={ordersQuery.data?.orders ?? []}
        title="Order History"
        description="Your previous account orders from the database."
        isLoading={ordersQuery.isLoading}
        isError={ordersQuery.isError}
      />
    </div>
  );
}
