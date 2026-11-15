import {OrderModel} from '../models/Order.model';
import {adminRepository} from '../repositories/admin.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {notificationService} from './notification.service';
import {pushService} from './push.service';
import {ApiError} from '../utils/error';

/*
 * Holiday pre-orders are managed by the owner. Cashiers can view them and
 * change their status from their own Pre-orders tab, so pre-order alerts go to
 * both roles (follow-up messages stay owner-only: cashiers cannot answer them).
 * Each alert opens the role's Pre-orders tab; the bell adds ?highlight=<order>
 * so the page opens that order's date and highlights it.
 */

type OwnerAlert = {
  type: 'new_order' | 'order_status' | 'order_message';
  title: string;
  message: string;
  orderId: string;
  link?: string;
};

const OWNER_LINK = '/owner/dashboard?tab=preorders';
const CASHIER_LINK = '/cashier/dashboard?tab=preorders';

/** Push notifications have no bell, so carry the highlight in the URL. */
function withHighlight(link: string, orderId: string) {
  return `${link}${link.includes('?') ? '&' : '?'}highlight=${orderId}`;
}

/**
 * Pre-order alert: in-app notification + push for every admin, and for every
 * cashier unless it is a follow-up message.
 */
export async function notifyOwners(alert: OwnerAlert) {
  await Promise.all([
    notifyAdmins(alert),
    alert.type === 'order_message' ? Promise.resolve() : notifyCashiers(alert)
  ]);
}

async function notifyCashiers(alert: OwnerAlert) {
  try {
    const cashiers = (await cashierRepository.listAll()) ?? [];
    for (const cashier of cashiers as Array<{_id: unknown}>) {
      await notificationService
        .createForCashier({
          cashierId: String(cashier._id),
          type: alert.type,
          title: alert.title,
          message: alert.message,
          orderId: alert.orderId,
          link: CASHIER_LINK
        })
        .catch(error => console.error('Failed to create cashier pre-order notification', error));
    }
    await pushService
      .sendToRole('cashier', {
        title: alert.title,
        body: alert.message,
        url: withHighlight(CASHIER_LINK, alert.orderId)
      })
      .catch(error => console.error('Failed to push pre-order to cashiers', error));
  } catch (error) {
    console.error('Failed to notify cashiers', error);
  }
}

async function notifyAdmins(alert: OwnerAlert) {
  const link = alert.link ?? OWNER_LINK;
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
      .sendToRole('admin', {title: alert.title, body: alert.message, url: withHighlight(link, alert.orderId)})
      .catch(error => console.error('Failed to push to owners', error));
  } catch (error) {
    console.error('Failed to notify owners', error);
  }
}

/** True when the order is a dated Holiday Pre-order. */
export async function isPreOrderId(orderId: string) {
  return !!(await OrderModel.exists({_id: orderId, isPreOrder: true}));
}

/** Cashiers may not take payments or answer follow-ups on pre-orders. */
export function assertCashierMayHandle(
  auth: {type?: string} | undefined,
  order: {isPreOrder?: boolean | null} | null | undefined
) {
  if (auth?.type === 'cashier' && order?.isPreOrder === true) {
    throw new ApiError(403, 'PREORDER_OWNER_ONLY', 'Pre-orders are handled by the owner.');
  }
}
