'use client';

import {Mail, CheckCheck, Trash2, MailOpen} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMyNotificationsQuery
} from '@/lib/hooks/notifications/useNotifications';
import type {Notification} from '@/lib/types/notification';
import type {NormalizedApiError} from '@/lib/api/types';

export default function CustomerNotifications() {
  const {data, isLoading, isError} = useMyNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleRead = async (notification: Notification) => {
    if (notification.read) return;
    try {
      await markReadMutation.mutateAsync(notification._id);
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to update notification.'
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success('All notifications marked as read.');
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ??
          'Failed to mark notifications as read.'
      );
    }
  };

  const handleDelete = async (notification: Notification) => {
    try {
      await deleteMutation.mutateAsync(notification._id);
      toast.success('Notification deleted.');
    } catch (error) {
      toast.error(
        (error as NormalizedApiError)?.message ?? 'Failed to delete notification.'
      );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">
            Replies and updates from the DonClaudio&apos;s team.
          </p>
        </div>
        {notifications.length > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            className="gap-2"
          >
            <CheckCheck size={16} />
            Mark all as read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          Loading notifications...
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-red-600">
          Failed to load notifications.
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl bg-white shadow p-5 text-sm text-gray-500">
          You have no notifications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification._id}
              onClick={() => handleRead(notification)}
              className={`rounded-2xl bg-white shadow p-5 flex gap-4 cursor-pointer transition-colors ${
                notification.read ? 'opacity-70' : 'border-l-4 border-[#f08080]'
              }`}
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#a4bbab] flex items-center justify-center">
                {notification.read ? (
                  <MailOpen className="w-5 h-5 text-white" />
                ) : (
                  <Mail className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-900">
                    {notification.title}
                  </p>
                  {!notification.read && (
                    <span className="inline-block h-2 w-2 rounded-full bg-[#f08080]" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {notification.createdAt
                    ? new Date(notification.createdAt).toLocaleString()
                    : ''}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  &ldquo;{notification.message}&rdquo;
                </p>
              </div>

              <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                {!notification.read && (
                  <span className="rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-semibold">
                    Unread
                  </span>
                )}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(notification);
                  }}
                  disabled={deleteMutation.isPending}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  aria-label="Delete notification"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
