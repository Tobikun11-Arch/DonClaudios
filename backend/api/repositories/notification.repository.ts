import {
  NotificationDocument,
  NotificationModel,
  NotificationType
} from '../models/Notification.model';
import mongoose from 'mongoose';

export const notificationRepository = {
  listByCustomerId: (customerId: string) =>
    NotificationModel.find({target: 'customer', customerId})
      .sort({createdAt: -1})
      .exec(),

  listByAdminId: (adminId: string) =>
    NotificationModel.find({target: 'admin', adminId})
      .sort({createdAt: -1})
      .exec(),

  listByCashierId: (cashierId: string) =>
    NotificationModel.find({target: 'cashier', cashierId})
      .sort({createdAt: -1})
      .exec(),

  findById: (id: string) => NotificationModel.findById(id).exec(),

  findReviewRequestByOrder: (customerId: string, orderId: string) =>
    NotificationModel.exists({
      target: 'customer',
      customerId,
      type: 'review_requested',
      orderId
    }).exec(),

  countUnreadByCustomerId: (customerId: string) =>
    NotificationModel.countDocuments({target: 'customer', customerId, read: false}).exec(),

  countUnreadByAdminId: (adminId: string) =>
    NotificationModel.countDocuments({target: 'admin', adminId, read: false}).exec(),

  countUnreadByCashierId: (cashierId: string) =>
    NotificationModel.countDocuments({target: 'cashier', cashierId, read: false}).exec(),

  create: (data: Partial<NotificationDocument>) =>
    NotificationModel.create(data),

  /**
   * Fan one announcement out to every customer in a single write.
   *
   * Returns 0 when there are no customers so the caller can skip a pointless
   * round trip.
   */
  createManyForCustomers: (
    customerIds: Array<string | mongoose.Types.ObjectId>,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
    }
  ) => {
    if (customerIds.length === 0) {
      return Promise.resolve([]);
    }
    return NotificationModel.insertMany(
      customerIds.map(customerId => ({
        target: 'customer' as const,
        customerId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link ?? null,
        read: false,
        readAt: null
      }))
    );
  },

  markRead: (id: string) =>
    NotificationModel.findByIdAndUpdate(
      id,
      {read: true, readAt: new Date()},
      {new: true}
    ).exec(),

  markAllReadByCustomerId: (customerId: string) =>
    NotificationModel.updateMany(
      {target: 'customer', customerId, read: false},
      {read: true, readAt: new Date()}
    ).exec(),

  markAllReadByAdminId: (adminId: string) =>
    NotificationModel.updateMany(
      {target: 'admin', adminId, read: false},
      {read: true, readAt: new Date()}
    ).exec(),

  markAllReadByCashierId: (cashierId: string) =>
    NotificationModel.updateMany(
      {target: 'cashier', cashierId, read: false},
      {read: true, readAt: new Date()}
    ).exec(),

  deleteById: (id: string) => NotificationModel.findByIdAndDelete(id).exec()
};
