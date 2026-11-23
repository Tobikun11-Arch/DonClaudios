import {ApiError} from '../utils/error';
import {orderRepository} from '../repositories/order.repository';
import {orderMessageRepository} from '../repositories/orderMessage.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {courierLabel, fulfillmentKind} from '../config/orderFlow';
import type {OrderActor, OrderDocument} from '../models/Order.model';
import {notificationService} from './notification.service';
import {notifyOwners} from './ownerNotify.service';
import {pushService} from './push.service';
import {staffActivityService} from './staffActivity.service';
import {actorLabel} from '../utils/actor';

export type CourierBookingInput = {
  riderName?: string | null;
  plateNumber?: string | null;
  trackingLink?: string | null;
  eta?: string | null;
};

/** Statuses in which the customer can say "I've booked my courier". */
const BOOKABLE = ['confirmed', 'preparing', 'ready'];

const STORE_NAME = "DonClaudio's";
const AUTO_REPLY =
  "Thanks! We've told the counter your rider is coming. We'll have your order packed and ready at the counter.";
const STAFF_ACK = "Got it! We'll have your order ready for your rider at the counter.";

function clean(value?: string | null, max = 120) {
  const v = typeof value === 'string' ? value.trim() : '';
  return v ? v.slice(0, max) : null;
}

function code(order: OrderDocument) {
  return `#${String(order._id).slice(-6).toUpperCase()}`;
}

function bookingSummary(order: OrderDocument, input: CourierBookingInput) {
  return [
    courierLabel(order.courier as any),
    input.riderName,
    input.plateNumber,
    input.eta ? `ETA ${input.eta}` : null
  ]
    .filter(Boolean)
    .join(' · ');
}

async function alertStaff(order: OrderDocument, title: string, message: string) {
  if (order.isPreOrder) {
    await notifyOwners({type: 'order_status', title, message, orderId: String(order._id)}).catch(error =>
      console.error('Failed to notify owners of courier booking', error)
    );
    return;
  }
  try {
    const cashiers = (await cashierRepository.listAll()) ?? [];
    for (const cashier of cashiers) {
      await notificationService
        .createForCashier({
          cashierId: String(cashier._id),
          type: 'courier_booked',
          title,
          message,
          orderId: String(order._id),
          link: `/cashier/dashboard/orders/${String(order._id)}`
        })
        .catch(error => console.error('Failed to create courier cashier notification', error));
    }
    await pushService.sendToRole('cashier', {
      title,
      body: message,
      url: `/cashier/dashboard/orders/${String(order._id)}`
    });
  } catch (error) {
    console.error('Failed to notify cashiers of courier booking', error);
  }
}

export const courierBookingService = {
  /**
   * Customer (or guest) booked their own courier: saved on the order, posted
   * in the order chat with an instant auto-reply, and the counter is alerted
   * so the food is ready when the rider arrives.
   */
  async book(orderId: string, input: CourierBookingInput, by: OrderActor) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (fulfillmentKind(order) !== 'courier_delivery') {
      throw new ApiError(400, 'NOT_COURIER_ORDER', 'Only orders where you book your own courier can do this.');
    }
    if (!BOOKABLE.includes(order.orderStatus)) {
      throw new ApiError(
        400,
        'COURIER_NOT_BOOKABLE',
        order.orderStatus === 'pending'
          ? 'Wait until the store confirms your order before booking a rider.'
          : 'This order can no longer be updated.'
      );
    }

    const link = clean(input.trackingLink, 500);
    if (link && !/^https?:\/\//i.test(link)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'The tracking link must start with http:// or https://');
    }
    const details: CourierBookingInput = {
      riderName: clean(input.riderName, 80),
      plateNumber: clean(input.plateNumber, 20),
      trackingLink: link,
      eta: clean(input.eta, 40)
    };

    const courierBooking = {...details, bookedAt: new Date(), acknowledgedAt: null, acknowledgedBy: null};
    await orderRepository.updateFields(orderId, {courierBooking});

    const summary = bookingSummary(order, details);
    const customerName =
      by.name ||
      [order.guestInfo?.firstName, order.guestInfo?.lastName].filter(Boolean).join(' ').trim() ||
      'Customer';

    await orderMessageRepository.create({
      orderId: order._id as any,
      customerId: order.customerId ?? null,
      authorType: 'customer',
      senderName: customerName,
      body: `🛵 I booked my courier: ${summary}${details.trackingLink ? `\nTrack rider: ${details.trackingLink}` : ''}`
    });
    // Instant reply so the customer knows the store got it.
    await orderMessageRepository.create({
      orderId: order._id as any,
      authorType: 'system',
      senderName: STORE_NAME,
      body: AUTO_REPLY
    });

    await alertStaff(order, `🛵 Courier booked for ${code(order)}`, `${customerName}: ${summary}`);

    return orderRepository.findById(orderId);
  },

  /** Staff: "Got it, we'll have it ready" — quick reply in the order chat. */
  async acknowledge(orderId: string, by: OrderActor, body?: string | null) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    if (!order.courierBooking) {
      throw new ApiError(400, 'NO_COURIER_BOOKING', 'The customer has not booked a courier yet.');
    }
    const text = clean(body, 1000) ?? STAFF_ACK;

    await orderRepository.updateFields(orderId, {
      'courierBooking.acknowledgedAt': new Date(),
      'courierBooking.acknowledgedBy': by
    });
    await orderMessageRepository.create({
      orderId: order._id as any,
      adminId: by.type === 'admin' ? (by.id as any) : null,
      authorType: 'admin',
      senderName: by.name || STORE_NAME,
      body: text
    });
    if (order.customerId) {
      await notificationService
        .createForCustomer({
          customerId: String(order.customerId),
          type: 'order_message',
          title: 'The store got your courier booking',
          message: `${STORE_NAME} replied about order ${code(order)}: "${text}"`,
          orderId,
          link: `/customer/dashboard/order-confirmation/${orderId}`
        })
        .catch(error => console.error('Failed to notify customer of courier ack', error));
    }
    await staffActivityService.record({
      actor: by,
      action: 'courier_ack',
      orderId,
      meta: {by: actorLabel(by)}
    });
    return orderRepository.findById(orderId);
  }
};
