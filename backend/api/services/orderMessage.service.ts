import {ApiError} from '../utils/error';
import {orderRepository} from '../repositories/order.repository';
import {orderMessageRepository} from '../repositories/orderMessage.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {notificationService} from './notification.service';
import type {OrderDocument} from '../models/Order.model';
import type {CustomerDocument} from '../models/Customer.model';
import type {AdminDocument} from '../models/Admin.model';
import type {CashierDocument} from '../models/Cashier.model';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

async function getOrderOrThrow(orderId: string) {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
  }
  return order;
}

export const orderMessageService = {

  async listFollowUpOrders() {
    const summaries = await orderMessageRepository.listOrderSummaries();
    const orderIds = summaries.map(s => String(s._id));
    const orders = await orderRepository.listByIds(orderIds);

    const ordersById = new Map<string, OrderDocument>();
    for (const order of orders) {
      ordersById.set(String(order._id), order);
    }

    const results: any[] = [];
    for (const summary of summaries) {
      const order = ordersById.get(String(summary._id));
      if (!order) continue;
      results.push({
        orderId: String(order._id),
        orderType: order.orderType,
        totalAmount: order.totalAmount,
        orderStatus: order.orderStatus,
        isGuest: order.isGuest,
        guestInfo: order.guestInfo,
        customerId: order.customerId ? String(order.customerId) : null,
        createdAt: order.createdAt,
        lastMessageAt: summary.lastMessageAt,
        lastMessage: summary.lastMessage,
        lastSender: summary.lastSender,
        messageCount: summary.count
      });
    }
    return results;
  },

  async listForCustomer(customerId: string, orderId: string) {
    const order = await getOrderOrThrow(orderId);
    if (String(order.customerId) !== String(customerId)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only view messages for your own orders'
      );
    }
    return orderMessageRepository.listByOrderId(orderId);
  },

  async listForAdmin(_adminId: string, orderId: string) {
    await getOrderOrThrow(orderId);
    return orderMessageRepository.listByOrderId(orderId);
  },

  async sendByCustomer(customerId: string, orderId: string, body: string) {
    if (!isNonEmptyString(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Message is required');
    }
    const order = await getOrderOrThrow(orderId);
    if (String(order.customerId) !== String(customerId)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You can only message your own orders'
      );
    }

    const customer = (await customerRepository.findById(customerId)) as
      | (CustomerDocument & {_id: unknown})
      | null;
    const senderName = customer
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
      : 'Customer';

    const message = await orderMessageRepository.create({
      orderId: order._id as any,
      customerId: customerId as any,
      authorType: 'customer',
      senderName: senderName || 'Customer',
      body: body.trim()
    });

    try {
      const cashiers = (await cashierRepository.listAll()) as
        | (CashierDocument & {_id: unknown})[]
        | null;
      for (const cashier of cashiers ?? []) {
        try {
          await notificationService.createForCashier({
            cashierId: String(cashier._id),
            type: 'order_message',
            title: 'Order follow-up',
            message: `${senderName || 'Customer'} asked about order #${String(order._id).slice(-6).toUpperCase()}: "${body.trim()}"`,
            orderId: orderId,
            link: '/cashier/dashboard?tab=orders'
          });
        } catch (error) {
          console.error('Failed to create order message cashier notification', error);
        }
      }
    } catch (error) {
      console.error('Failed to notify cashiers about order message', error);
    }

    return message;
  },

  async sendByAdmin(adminId: string, orderId: string, body: string) {
    if (!isNonEmptyString(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Message is required');
    }

    const order: OrderDocument = await getOrderOrThrow(orderId);

    const admin = (await adminRepository.findById(adminId)) as
      | (AdminDocument & {_id: unknown})
      | null;
    const senderName = admin
      ? [admin.firstName, admin.lastName].filter(Boolean).join(' ')
      : "DonClaudio's Team";

    const message = await orderMessageRepository.create({
      orderId: order._id as any,
      adminId: adminId as any,
      authorType: 'admin',
      senderName: senderName || "DonClaudio's Team",
      body: body.trim()
    });

    if (order.customerId) {
      try {
        await notificationService.createForCustomer({
          customerId: String(order.customerId),
          type: 'order_message',
          title: 'Reply about your order',
          message: `DonClaudio's replied about order #${String(order._id).slice(-6).toUpperCase()}: "${body.trim()}"`,
          orderId: orderId,
          link: '/customer/dashboard?tab=history'
        });
      } catch (error) {
        console.error('Failed to create order message customer notification', error);
      }
    }

    return message;
  }
};
