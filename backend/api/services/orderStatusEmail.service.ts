import {env} from '../config/env';
import {STORE_ADDRESS} from '../config/delivery';
import {courierLabel, fulfillmentKind} from '../config/orderFlow';
import type {OrderDocument, OrderStatus} from '../models/Order.model';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {customerRepository} from '../repositories/customer.repository';
import {settingsRepository} from '../repositories/settings.repository';
import {emailService} from './email.service';
import {orderStatusEmailTemplate} from '../templates/orderStatusEmail';

/** The statuses that send an email. `completed` already sends the receipt. */
const EMAILED_STATUSES: OrderStatus[] = ['ready', 'on_the_way', 'cancelled'];

type StatusCopy = {subject: string; headline: string; message: string; detail?: string | null};

function copyFor(order: OrderDocument, status: OrderStatus): StatusCopy | null {
  const code = `#${String(order._id).slice(-6).toUpperCase()}`;
  const kind = fulfillmentKind(order);
  if (status === 'ready') {
    if (kind === 'courier_delivery') {
      const courier = courierLabel(order.courier as any);
      return {
        subject: `Your order ${code} is ready for your courier 🛵`,
        headline: 'Ready for your courier',
        message: order.courierBooking
          ? `Your food is packed and waiting at the counter for your ${courier} rider.`
          : `Your food is ready. Book your ${courier} rider now if you haven't yet.`,
        detail: `Pick-up address for the rider: ${STORE_ADDRESS}`
      };
    }
    return {
      subject: `Your order ${code} is ready for pick-up 🍗`,
      headline: 'Ready for pick-up',
      message: 'Your order is ready! Please pick it up at the store.',
      detail: STORE_ADDRESS
    };
  }
  if (status === 'on_the_way') {
    return {
      subject: `Your order ${code} is on the way 🛵`,
      headline: 'On the way',
      message: "Our rider has your order and is heading to you now. Please keep your phone close.",
      detail: order.guestInfo?.address ? `Delivering to: ${order.guestInfo.address}` : null
    };
  }
  if (status === 'cancelled') {
    return {
      subject: `Your order ${code} was cancelled`,
      headline: 'Order cancelled',
      message: 'Your order was cancelled. If you paid online, your refund follows our refund policy.',
      detail: order.cancelReason ? `Reason: ${order.cancelReason}` : null
    };
  }
  return null;
}

/**
 * Emails the customer (account email or the guest's email) when an order is
 * ready / on the way / cancelled. One email per status (claimed atomically on
 * the order), skipped when the customer turned order emails off. Never throws:
 * an email problem must not fail the status change.
 */
export async function sendOrderStatusEmail(orderId: string, status: OrderStatus) {
  try {
    if (!EMAILED_STATUSES.includes(status)) return;
    const order = await orderRepository.findById(orderId);
    if (!order || order.orderSource === 'in-store') return;

    let to: string | null = null;
    let name = [order.guestInfo?.firstName, order.guestInfo?.lastName].filter(Boolean).join(' ');
    if (order.customerId) {
      const customer = await customerRepository.findById(String(order.customerId));
      if (!customer || customer.orderEmailUpdates === false) return;
      to = customer.email;
      name = name || [customer.firstName, customer.lastName].filter(Boolean).join(' ');
    } else if (order.guestInfo?.email) {
      to = order.guestInfo.email.trim();
    }
    if (!to) return;

    const copy = copyFor(order, status);
    if (!copy) return;

    // Claim last, right before sending, so a skipped email can still go out later.
    const claimed = await orderRepository.claimStatusEmail(orderId, status);
    if (!claimed) return;

    const siteUrl = (env.FRONTEND_URL || 'https://www.donclaudios.com').replace(/\/+$/, '');
    const trackUrl = order.customerId
      ? `${siteUrl}/customer/dashboard/order-confirmation/${orderId}`
      : `${siteUrl}/order-confirmation/${orderId}`;
    const items = await orderItemRepository.listByOrderId(orderId).catch(() => []);
    const settings = await settingsRepository.findOne().catch(() => null);
    const contact = (settings as any)?.contact ?? {};

    const {html, text} = orderStatusEmailTemplate({
      customerName: name || 'there',
      orderCode: `#${orderId.slice(-6).toUpperCase()}`,
      headline: copy.headline,
      message: copy.message,
      detail: copy.detail,
      items: (items ?? []).map((i: any) => ({name: i.name ?? 'Item', quantity: i.quantity})),
      trackUrl,
      businessName: "DonClaudio's Lechon House",
      businessPhone: Array.isArray(contact.phones) ? contact.phones[0] : undefined
    });
    await emailService.sendEmail({to, subject: copy.subject, text, html});
  } catch (error) {
    console.error('Failed to send order status email', error);
  }
}
