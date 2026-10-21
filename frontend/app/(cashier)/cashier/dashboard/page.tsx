import {CashierOrders} from '@/features/cashier/orders/components/CashierOrders';
import {PushNotificationManager} from '@/components/pwa/PushNotificationManager';

export default function CashierDashboard() {
  return (
    <>
      <div className="px-4 pt-4">
        <PushNotificationManager />
      </div>
      <CashierOrders />
    </>
  );
}