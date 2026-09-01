'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bell, BellRing, CheckCheck, Trash2, Mail, MailOpen} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMyNotificationsQuery
} from '@/lib/hooks/notifications/useNotifications';
import {useNotificationSound} from '@/lib/hooks/notifications/useNotificationSound';
import type {Notification} from '@/lib/types/notification';
import type {NormalizedApiError} from '@/lib/api/types';

export default function CustomerNotificationBell() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {data, isLoading} = useMyNotificationsQuery();
  const markReadMutation = useMarkNotificationReadMutation();
  const markAllReadMutation = useMarkAllNotificationsReadMutation();
  const deleteMutation = useDeleteNotificationMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  useNotificationSound(notifications);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = () => {
    setOpen(prev => !prev);
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await markReadMutation.mutateAsync(notification._id);
      } catch (error) {
        toast.error(
          (error as NormalizedApiError)?.message ?? 'Failed to update notification.'
        );
      }
    }
    setOpen(false);
    const destination = destinationFor(notification);
    if (destination) {
      router.push(destination);
    }
  };

  const destinationFor = (notification: Notification) => {
    if (notification.type === 'review_reply') {
      return '/customer/dashboard?tab=reviews';
    }
    if (notification.link) {
      return notification.link;
    }
    return null;
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

  const handleDelete = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
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
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-[#2d4a35]" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              <p className="text-xs text-gray-500">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'You are all caught up'}
              </p>
            </div>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending || unreadCount === 0}
                className="gap-1 text-xs"
              >
                <CheckCheck size={14} />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-5 text-sm text-gray-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-5 text-sm text-gray-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification._id}
                  onClick={() => handleClick(notification)}
                  className={`flex cursor-pointer gap-3 border-b border-gray-50 px-4 py-3 transition-colors hover:bg-gray-50 ${
                    notification.read ? 'opacity-70' : 'bg-amber-50/40'
                  }`}
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-[#a4bbab] flex items-center justify-center">
                    {notification.read ? (
                      <MailOpen className="h-4 w-4 text-white" />
                    ) : (
                      <Mail className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-gray-600">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {notification.createdAt
                        ? new Date(notification.createdAt).toLocaleString()
                        : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => handleDelete(e, notification)}
                    disabled={deleteMutation.isPending}
                    className="shrink-0 self-center rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
