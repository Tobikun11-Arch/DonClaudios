'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bell, BellRing, CheckCheck, Trash2, Mail, MailOpen} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {useAdminNotificationsQuery,
  useDeleteAdminNotificationMutation,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation
} from '@/lib/hooks/notifications/useNotifications';
import {useNotificationSound} from '@/lib/hooks/notifications/useNotificationSound';
import type {Notification} from '@/lib/types/notification';
import {getFriendlyErrorMessage} from '@/lib/api/getFriendlyErrorMessage';
import {notificationUrl} from '@/lib/notifications/notificationUrl';
import {FilterSelect} from '@/shared/components/FilterPills';

const CATEGORIES = [
  {key: 'orders', label: 'Orders'},
  {key: 'preorders', label: 'Pre-orders'},
  {key: 'cancellations', label: 'Cancellations & refunds'},
  {key: 'reviews', label: 'Reviews'},
  {key: 'inventory', label: 'Inventory'},
  {key: 'other', label: 'Other'}
] as const;
type Category = (typeof CATEGORIES)[number]['key'];

/**
 * Bucket an owner notification for the bell's filter. Pre-order alerts share
 * types with regular orders, so they are told apart by their Pre-orders link;
 * cancellations and refunds are picked out by title across both.
 */
function categoryOf(n: Notification): Category {
  if (/cancel|refund/i.test(n.title)) return 'cancellations';
  if (n.link?.includes('tab=preorders')) return 'preorders';
  switch (n.type) {
    case 'review_submitted':
      return 'reviews';
    case 'low_stock':
      return 'inventory';
    case 'new_order':
    case 'order_status':
    case 'order_message':
    case 'order_overdue':
    case 'order_delayed':
    case 'courier_booked':
    case 'points_adjustment':
      return 'orders';
    default:
      return 'other';
  }
}

export default function OwnerNotificationBell({alert = false}: {alert?: boolean}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<'all' | Category>('all');
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {data, isLoading} = useAdminNotificationsQuery();
  const markReadMutation = useMarkAdminNotificationReadMutation();
  const markAllReadMutation = useMarkAllAdminNotificationsReadMutation();
  const deleteMutation = useDeleteAdminNotificationMutation();

  const notifications = useMemo(() => data?.notifications ?? [], [data]);
  const unreadCount = data?.unreadCount ?? 0;
  useNotificationSound(notifications);

  // The list is not paginated, so filter here; the badge stays the overall
  // unread count and each option shows its own unread count.
  const {visible, categoryOptions} = useMemo(() => {
    const unreadBy = new Map<Category, number>();
    const present = new Set<Category>();
    for (const n of notifications) {
      const c = categoryOf(n);
      present.add(c);
      if (!n.read) unreadBy.set(c, (unreadBy.get(c) ?? 0) + 1);
    }
    const withUnread = (label: string, count: number) =>
      count > 0 ? `${label} (${count} unread)` : label;
    return {
      visible:
        category === 'all'
          ? notifications
          : notifications.filter(n => categoryOf(n) === category),
      categoryOptions: [
        {value: 'all', label: withUnread('All', unreadCount)},
        ...CATEGORIES.filter(c => c.key !== 'other' || present.has('other') || category === 'other').map(c => ({
          value: c.key,
          label: withUnread(c.label, unreadBy.get(c.key) ?? 0)
        }))
      ]
    };
  }, [notifications, unreadCount, category]);

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

  const handleOpen = async () => {
    setOpen(prev => !prev);
  };

  const handleClick = (notification: Notification) => {
    // Navigate first so a slow "mark read" never blocks the redirect.
    setOpen(false);
    if (notification.link) router.push(notificationUrl(notification.link, notification));
    if (!notification.read) {
      markReadMutation.mutateAsync(notification._id).catch(error =>
        toast.error(getFriendlyErrorMessage(error, 'Failed to update notification.'))
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success('All notifications marked as read.');
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to mark notifications as read.')
      );
    }
  };

  const handleDelete = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    try {
      await deleteMutation.mutateAsync(notification._id);
    } catch (error) {
      toast.error(
        getFriendlyErrorMessage(error, 'Failed to delete notification.')
      );
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-gray-600 dark:text-gray-300 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-[#2d4a35] dark:text-[#7ed4a0]" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f08080] px-1.5 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
        {alert && unreadCount === 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#f08080]" />
        )}
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="ux-scrim fixed inset-0 z-[55] overscroll-contain bg-black/30 sm:hidden"
          />
          {/*
            Bottom sheet below `sm`: the bell is flush right, so `absolute right-0
            w-80` grew leftward past the viewport on narrow phones and
            `overflow-x: hidden` clipped it. Horizontal placement is rebuilt
            at `sm` for the anchored popover.
          */}
          <div
            role="dialog"
            aria-label="Notifications"
            className="ux-pop [--ux-origin:bottom_center] sm:[--ux-origin:top_right] fixed inset-x-3 bottom-24 z-[60] max-h-[70vh] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-12 sm:w-96 sm:max-h-none sm:overflow-y-visible sm:overscroll-auto"
          >
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
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

          {notifications.length > 0 && (
            <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-2">
              <FilterSelect
                value={category}
                onChange={value => setCategory(value as 'all' | Category)}
                options={categoryOptions}
                ariaLabel="Filter notifications by category"
              />
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto sm:max-h-80">
            {isLoading ? (
              <div className="p-5 text-sm text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-5 text-sm text-gray-500 dark:text-gray-400">
                No notifications yet.
              </div>
            ) : visible.length === 0 ? (
              <div className="p-5 text-sm text-gray-500 dark:text-gray-400">
                No notifications in this category.
              </div>
            ) : (
              visible.map(notification => (
                <div
                  key={notification._id}
                  onClick={() => handleClick(notification)}
                  className={`flex cursor-pointer gap-3 border-b border-gray-50 dark:border-gray-700 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${
                    notification.read ? 'opacity-70' : 'bg-amber-50/40 dark:bg-amber-500/10'
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
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {notification.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
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
                    className="shrink-0 self-center rounded-lg p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
          </div>
        </>
      )}
    </div>
  );
}
