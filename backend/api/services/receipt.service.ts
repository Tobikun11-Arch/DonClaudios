import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {customerRepository} from '../repositories/customer.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {settingsRepository} from '../repositories/settings.repository';
import {emailService} from './email.service';
import {receiptEmailTemplate} from '../templates/receiptEmail';
import type {ReceiptEmailParams} from '../templates/receiptEmail';
import type {OrderDocument} from '../models/Order.model';

/**
 * Sends an order-summary (receipt) email to the customer of an order that has
 * reached a completed state. Only sends when a recipient email is known.
 */
export async function sendOrderReceiptEmail(orderId: string): Promise<boolean> {
  const order = await orderRepository.findById(orderId);
  if (!order) return false;

  const recipientEmail = await resolveRecipientEmail(order);
  if (!recipientEmail) return false;

  const [items, transaction, settings] = await Promise.all([
    orderItemRepository.listByOrderIds([orderId]),
    transactionRepository.findByOrderId(orderId),
    settingsRepository.findOrCreate()
  ]);

  const customerName = await resolveCustomerName(order);

  const itemRows = items.map(item => {
    const product = item.productId as unknown as
      | {_id: string; name?: string}
      | undefined;
    const name = product?.name || 'Item';
    const quantity = item.quantity;
    const price = item.price;
    const subtotal = price * quantity;
    return {name, quantity, price, subtotal};
  });

  const subtotal = itemRows.reduce((sum, item) => sum + item.subtotal, 0);
  const total = order.totalAmount;
  const discount = Math.max(0, subtotal - total);

  const orderTypeLabel =
    {
      pickup: 'Pickup',
      delivery: 'Delivery',
      reservation: 'Reservation'
    }[order.orderType] ?? order.orderType;

  const paymentLabel =
    {
      cash: 'Cash',
      card: 'Card',
      gcash: 'GCash',
      other: 'Other'
    }[transaction?.paymentMethod ?? 'cash'] ?? 'Cash';

  const businessName = settings.footer?.brandName || 'DonClaudio’s Lechon House';
  const businessAddress = settings.footer?.address || settings.contact?.address;
  const businessContact =
    settings.footer?.email ||
    settings.contact?.email ||
    settings.footer?.phones?.[0] ||
    settings.contact?.phones?.[0];

  const params: ReceiptEmailParams = {
    customerName,
    orderNumber: `#${String(order._id).slice(-6).toUpperCase()}`,
    orderDatetime: `${new Date(
      order.createdAt
    ).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}`,
    orderType: orderTypeLabel,
    staffName: order.orderSource === 'in-store'
      ? await resolveStaffName(order)
      : undefined,
    paymentMethod: paymentLabel,
    items: itemRows,
    subtotal,
    discount,
    total,
    businessName,
    businessAddress,
    businessContact
  };

  const {subject, text, html} = receiptEmailTemplate(params);

  await emailService.sendEmail({
    to: recipientEmail,
    subject,
    text,
    html
  });

  return true;
}

async function resolveRecipientEmail(order: OrderDocument): Promise<string | null> {
  if (order.customerId) {
    const customers = await customerRepository.listByIds([
      String(order.customerId)
    ]);
    const customer = customers[0];
    if (customer?.email) return customer.email;
  }
  if (order.guestInfo?.email) return order.guestInfo.email;
  return null;
}

async function resolveCustomerName(order: OrderDocument): Promise<string> {
  if (order.customerId) {
    const customers = await customerRepository.listByIds([
      String(order.customerId)
    ]);
    const customer = customers[0];
    if (customer) {
      return [customer.firstName, customer.lastName].filter(Boolean).join(' ');
    }
  }
  if (order.guestInfo) {
    return [order.guestInfo.firstName, order.guestInfo.lastName]
      .filter(Boolean)
      .join(' ');
  }
  return 'there';
}

async function resolveStaffName(order: OrderDocument): Promise<string | undefined> {
  if (order.orderSource !== 'in-store') return undefined;

  const transaction = await transactionRepository.findByOrderId(
    String(order._id)
  );
  if (!transaction?.cashierId) return undefined;

  const cashier = await cashierRepository.findById(String(transaction.cashierId));
  if (!cashier) return undefined;

  return [cashier.firstName, cashier.lastName].filter(Boolean).join(' ');
}
