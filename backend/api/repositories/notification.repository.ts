import {NotificationDocument, NotificationModel} from '../models/Notification.model';

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
