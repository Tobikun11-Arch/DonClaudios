import {ApiError} from '../utils/error';
import {notificationRepository} from '../repositories/notification.repository';
import {customerRepository} from '../repositories/customer.repository';
import {
  formatPreOrderDeadlineShort,
  isPreOrderClosed
} from '../config/preOrder';

/**
 * Announce an open pre-order to every customer with an account.
 *
 * Guests are deliberately not included: they cannot see or order pre-orders,
 * so a notification would be noise.
 *
 * Callers are responsible for only invoking this on an OFF -> ON transition.
 *
 * @returns how many customers were notified.
 */
async function announcePreOrderToCustomers(product: {
  _id: unknown;
  name: string;
  preOrderDeadline?: Date | null;
  preOrderPurchaseLimit?: number | null;
}): Promise<number> {
  // An already-expired pre-order is not worth announcing.
  if (isPreOrderClosed(product.preOrderDeadline)) return 0;

  const deadline = formatPreOrderDeadlineShort(product.preOrderDeadline);
  const limit = product.preOrderPurchaseLimit;

  const details: string[] = [];
  if (deadline) details.push(`until ${deadline}`);
  if (typeof limit === 'number' && limit >= 1) {
    details.push(`max ${limit} per customer`);
  }

  const customers = await customerRepository.listAllIds();
  const customerIds = customers.map(c => c._id);

  const created = await notificationRepository.createManyForCustomers(
    customerIds,
    {
      type: 'pre_order',
      title: 'Pre-order available',
      message:
        `${product.name} is now open for pre-order` +
        (details.length > 0 ? ` (${details.join(', ')}).` : '.') +
        ' Tap to view and order.',
      link: `/customer/dashboard/${product._id}`
    }
  );

  return created.length;
}

export const notificationService = {
  announcePreOrderToCustomers,

  async listForCustomer(customerId: string) {
    return notificationRepository.listByCustomerId(customerId);
  },

  async countUnreadForCustomer(customerId: string) {
    return notificationRepository.countUnreadByCustomerId(customerId);
  },

  async listForAdmin(adminId: string) {
    return notificationRepository.listByAdminId(adminId);
  },

  async countUnreadForAdmin(adminId: string) {
    return notificationRepository.countUnreadByAdminId(adminId);
  },

  async listForCashier(cashierId: string) {
    return notificationRepository.listByCashierId(cashierId);
  },

  async countUnreadForCashier(cashierId: string) {
    return notificationRepository.countUnreadByCashierId(cashierId);
  },

  async createForCustomer(data: {
    customerId: string;
    type: 'review_reply' | 'review_auto_rejected' | 'review_requested' | 'order_message' | 'order_status' | 'order_delayed' | 'support_message' | 'pre_order';
    title: string;
    message: string;
    reviewId?: string;
    orderId?: string;
    link?: string;
  }) {
    return notificationRepository.create({
      target: 'customer',
      customerId: data.customerId as any,
      type: data.type,
      title: data.title,
      message: data.message,
      reviewId: data.reviewId ? (data.reviewId as any) : undefined,
      orderId: data.orderId ? (data.orderId as any) : undefined,
      link: data.link
    });
  },

  async createReviewRequestForCustomer(data: {
    customerId: string;
    orderId: string;
    title: string;
    message: string;
  }) {
    const existing = await notificationRepository.findReviewRequestByOrder(
      data.customerId,
      data.orderId
    );
    if (existing) return null;

    return notificationRepository.create({
      target: 'customer',
      customerId: data.customerId as any,
      orderId: data.orderId as any,
      type: 'review_requested',
      title: data.title,
      message: data.message,
      link: '/customer/dashboard?tab=reviews'
    });
  },

  async createForAdmin(data: {
    adminId: string;
    type: 'review_submitted' | 'order_message' | 'low_stock' | 'new_order' | 'support_message';
    title: string;
    message: string;
    reviewId?: string;
    orderId?: string;
    link?: string;
  }) {
    return notificationRepository.create({
      target: 'admin',
      adminId: data.adminId as any,
      type: data.type,
      title: data.title,
      message: data.message,
      reviewId: data.reviewId ? (data.reviewId as any) : undefined,
      orderId: data.orderId ? (data.orderId as any) : undefined,
      link: data.link
    });
  },

  async createForCashier(data: {
    cashierId: string;
    type: 'order_message' | 'order_status' | 'new_order' | 'order_overdue';
    title: string;
    message: string;
    orderId?: string;
    link?: string;
  }) {
    return notificationRepository.create({
      target: 'cashier',
      cashierId: data.cashierId as any,
      type: data.type,
      title: data.title,
      message: data.message,
      orderId: data.orderId ? (data.orderId as any) : undefined,
      link: data.link
    });
  },

  async markRead(customerId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (String(notification.customerId) !== customerId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only update your own notifications'
      );
    }
    return notificationRepository.markRead(notificationId);
  },

  async markReadForAdmin(adminId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (String(notification.adminId) !== adminId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only update your own notifications'
      );
    }
    return notificationRepository.markRead(notificationId);
  },

  async markReadForCashier(cashierId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (String(notification.cashierId) !== cashierId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only update your own notifications'
      );
    }
    return notificationRepository.markRead(notificationId);
  },

  async markAllRead(customerId: string) {
    await notificationRepository.markAllReadByCustomerId(customerId);
    return notificationRepository.countUnreadByCustomerId(customerId);
  },

  async markAllReadForAdmin(adminId: string) {
    await notificationRepository.markAllReadByAdminId(adminId);
    return notificationRepository.countUnreadByAdminId(adminId);
  },

  async markAllReadForCashier(cashierId: string) {
    await notificationRepository.markAllReadByCashierId(cashierId);
    return notificationRepository.countUnreadByCashierId(cashierId);
  },

  async remove(customerId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (String(notification.customerId) !== customerId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only delete your own notifications'
      );
    }
    await notificationRepository.deleteById(notificationId);
    return {message: 'Notification deleted'};
  },

  async removeForAdmin(adminId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (String(notification.adminId) !== adminId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only delete your own notifications'
      );
    }
    await notificationRepository.deleteById(notificationId);
    return {message: 'Notification deleted'};
  },

  async removeForCashier(cashierId: string, notificationId: string) {
    const notification = await notificationRepository.findById(notificationId);
    if (!notification) {
      throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
    }
    if (String(notification.cashierId) !== cashierId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only delete your own notifications'
      );
    }
    await notificationRepository.deleteById(notificationId);
    return {message: 'Notification deleted'};
  }
};
