import {ApiError} from '../utils/error';
import {notificationRepository} from '../repositories/notification.repository';

export const notificationService = {
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

  async createForCustomer(data: {
    customerId: string;
    type: 'review_reply' | 'order_status';
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

  async createForAdmin(data: {
    adminId: string;
    type: 'review_submitted' | 'low_stock';
    title: string;
    message: string;
    reviewId?: string;
    link?: string;
  }) {
    return notificationRepository.create({
      target: 'admin',
      adminId: data.adminId as any,
      type: data.type,
      title: data.title,
      message: data.message,
      reviewId: data.reviewId ? (data.reviewId as any) : undefined,
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

  async markAllRead(customerId: string) {
    await notificationRepository.markAllReadByCustomerId(customerId);
    return notificationRepository.countUnreadByCustomerId(customerId);
  },

  async markAllReadForAdmin(adminId: string) {
    await notificationRepository.markAllReadByAdminId(adminId);
    return notificationRepository.countUnreadByAdminId(adminId);
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
  }
};
