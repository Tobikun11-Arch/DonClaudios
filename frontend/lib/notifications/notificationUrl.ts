import type {Notification} from '@/lib/types/notification';

/**
 * Where a notification click goes: its link plus `highlight=<order|review>`
 * so the page scrolls to and flashes that item. `hl` is a fresh token per
 * click, so clicking the same notification again (same URL otherwise) still
 * re-runs the scroll and highlight.
 */
export function notificationUrl(link: string, notification: Notification) {
  const highlightId = notification.orderId ?? notification.reviewId;
  if (!highlightId) return link;
  const params = new URLSearchParams({highlight: String(highlightId), hl: String(Date.now())});
  if (notification.type === 'order_message') params.set('openChat', '1');
  return `${link}${link.includes('?') ? '&' : '?'}${params.toString()}`;
}
