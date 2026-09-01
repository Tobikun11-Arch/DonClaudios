export type NotificationType = 'review_reply' | 'review_submitted' | 'low_stock' | 'order_status';
export type NotificationTarget = 'customer' | 'admin';

export interface Notification {
  _id: string;
  target: NotificationTarget;
  customerId?: string | null;
  adminId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  reviewId?: string | null;
  orderId?: string | null;
  link?: string | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface NotificationResponse {
  notification: Notification;
}

export interface MarkAllReadResponse {
  unreadCount: number;
}

export interface DeleteNotificationResponse {
  message: string;
}
