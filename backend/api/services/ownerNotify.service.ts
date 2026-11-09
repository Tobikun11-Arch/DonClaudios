import {OrderModel} from '../models/Order.model';
import {adminRepository} from '../repositories/admin.repository';
import {notificationService} from './notification.service';
import {pushService} from './push.service';
import {ApiError} from '../utils/error';

/*
 * Holiday pre-orders are handled by the owner only: cashiers never see them,
 * and every alert about one goes to the owner/admin accounts instead.
 */

type OwnerAlert = {
  type: 'new_order' | 'order_status' | 'order_message';
  title: string;
  message: string;
  orderId: string;
  link?: string;
};

/** In-app notification for every admin plus a push to the admin role. */
export async function notifyOwners(alert: OwnerAlert) {
  const link = alert.link ?? '/owner/dashboard?tab=orders';
  try {
    const admins = (await adminRepository.listAll()) ?? [];
    for (const admin of admins as Array<{_id: unknown}>) {
      await notificationService
        .createForAdmin({
          adminId: String(admin._id),
          type: alert.type,
          title: alert.title,
          message: alert.message,
          orderId: alert.orderId,
          link
        })
        .catch(error => console.error('Failed to create owner notification', error));
    }
    await pushService
      .sendToRole('admin', {title: alert.title, body: alert.message, url: link})
      .catch(error => console.error('Failed to push to owners', error));
  } catch (error) {
    console.error('Failed to notify owners', error);
  }
}

/** True when the order is a dated Holiday Pre-order. */
export async function isPreOrderId(orderId: string) {
  return !!(await OrderModel.exists({_id: orderId, isPreOrder: true}));
}

/** Cashiers may not open or act on pre-orders. */
export function assertCashierMayHandle(
  auth: {type?: string} | undefined,
  order: {isPreOrder?: boolean | null} | null | undefined
) {
  if (auth?.type === 'cashier' && order?.isPreOrder === true) {
    throw new ApiError(403, 'PREORDER_OWNER_ONLY', 'Pre-orders are handled by the owner.');
  }
}
