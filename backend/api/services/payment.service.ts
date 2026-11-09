import crypto from 'crypto';
import {env} from '../config/env';
import {
  PAYMENT_CHANNELS,
  PAYMENT_FEES,
  computeCharge,
  downPaymentAmount,
  type PaymentChannel,
  type PaymentQuote
} from '../config/paymentFees';
import type {OrderDocument, OrderStatus} from '../models/Order.model';
import type {PaymentDocument, PaymentKind} from '../models/Payment.model';
import type {PaymentMethod} from '../models/Transaction.model';
import type {CashierDocument} from '../models/Cashier.model';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {productRepository} from '../repositories/product.repository';
import {paymentRepository} from '../repositories/payment.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {cashierRepository} from '../repositories/cashier.repository';
import {adminRepository} from '../repositories/admin.repository';
import {notificationService} from './notification.service';
import {pushService} from './push.service';
import {stockMovementService} from './stockMovement.service';
import {preOrderEventService} from './preOrderEvent.service';
import {isPreOrderId, notifyOwners} from './ownerNotify.service';
import {
  isXenditConfigured,
  xenditService,
  type XenditInvoice
} from './xendit.service';
import {ApiError} from '../utils/error';

/*
 * Xendit payment flow for ONLINE orders (counter orders never come here).
 *
 *   cashier confirms -> customer picks: online full | online 50% down payment
 *   (pre-order-only carts) | cash on pickup (pickup only)
 *   -> Xendit invoice -> PAID webhook -> order paymentStatus updated
 *   -> cashier may start preparing.
 *   Unpaid invoice EXPIRED -> order auto-cancelled.
 *   Staff cancels a paid order -> automatic refund through the Refund API.
 */

const orderCode = (orderId: string) => orderId.slice(-6).toUpperCase();
const peso = (n: number) =>
  `₱${n.toLocaleString('en-PH', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`;

// ---------------------------------------------------------------------------
// Order helpers
// ---------------------------------------------------------------------------

async function getOrderProductFlags(order: OrderDocument) {
  const items = await orderItemRepository.listByOrderIds([String(order._id)]);
  const productIds = items.map(item => {
    const pid: any = item.productId;
    return String(pid?._id ?? pid);
  });
  const products = await productRepository.findManyByIds(productIds);
  return {
    // Missing/deleted products count as regular: the safe side of the rule.
    hasRegular:
      products.length === 0 || products.some(p => p?.isPreOrder !== true),
    hasPreOrder: products.some(p => p?.isPreOrder === true)
  };
}

/** Down payments are only for carts made up entirely of pre-order products. */
export async function orderAllowsDownPayment(order: OrderDocument) {
  if (order.isPreOrder) return true;
  const flags = await getOrderProductFlags(order);
  return !flags.hasRegular;
}

function isPaidLike(status: PaymentDocument['status']) {
  return (
    status === 'PAID' ||
    status === 'REFUND_PENDING' ||
    status === 'REFUNDED' ||
    status === 'REFUND_FAILED'
  );
}

function channelToMethod(channel: PaymentChannel): PaymentMethod {
  switch (channel) {
    case 'gcash':
      return 'gcash';
    case 'maya':
      return 'maya';
    case 'grabpay':
      return 'grabpay';
    case 'shopeepay':
      return 'shopeepay';
    case 'card':
      return 'card';
  }
}

function redirectUrls(order: OrderDocument) {
  const base = (env.FRONTEND_URL ?? '').replace(/\/+$/, '');
  if (!base) return {};
  const path = order.isGuest
    ? `/order-confirmation/${String(order._id)}`
    : `/customer/dashboard/order-confirmation/${String(order._id)}`;
  return {
    successRedirectUrl: `${base}${path}?payment=success`,
    failureRedirectUrl: `${base}${path}?payment=failed`
  };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function assertWebhookToken(token: unknown) {
  const expected = env.XENDIT_WEBHOOK_TOKEN;
  if (!expected || typeof token !== 'string' || !safeEqual(token, expected)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid callback token');
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function notifyStaff(title: string, message: string, orderId: string) {
  // Pre-orders are owner-only: skip the cashiers entirely.
  if (await isPreOrderId(orderId).catch(() => false)) {
    await notifyOwners({type: 'order_status', title, message, orderId});
    return;
  }
  try {
    const cashiers = ((await cashierRepository.listAll()) ?? []) as Array<
      CashierDocument & {_id: unknown}
    >;
    for (const cashier of cashiers) {
      try {
        await notificationService.createForCashier({
          cashierId: String(cashier._id),
          type: 'order_status',
          title,
          message,
          orderId,
          link: '/cashier/dashboard?tab=orders'
        });
      } catch (error) {
        console.error('Failed to create cashier payment notification', error);
      }
    }
    await pushService
      .sendToRole('cashier', {title, body: message, url: '/cashier/dashboard?tab=orders'})
      .catch(error => console.error('Failed to push payment to cashiers', error));
    await pushService
      .sendToRole('admin', {title, body: message, url: '/owner/dashboard?tab=orders'})
      .catch(error => console.error('Failed to push payment to admins', error));
  } catch (error) {
    console.error('Failed to notify staff about payment', error);
  }
}

async function notifyAdmins(title: string, message: string, orderId: string) {
  try {
    const admins = (await adminRepository.listAll()) ?? [];
    for (const admin of admins) {
      await notificationService.createForAdmin({
        adminId: String(admin._id),
        type: 'order_status',
        title,
        message,
        orderId,
        link: '/owner/dashboard?tab=orders'
      });
    }
  } catch (error) {
    console.error('Failed to notify admins about payment', error);
  }
}

async function notifyCustomer(
  order: OrderDocument,
  title: string,
  message: string
) {
  if (!order.customerId) return;
  try {
    await notificationService.createForCustomer({
      customerId: String(order.customerId),
      type: 'order_status',
      title,
      message,
      orderId: String(order._id),
      link: '/customer/dashboard?tab=history'
    });
  } catch (error) {
    console.error('Failed to notify customer about payment', error);
  }
}

// ---------------------------------------------------------------------------
// Invoice housekeeping
// ---------------------------------------------------------------------------

/**
 * Cancels every open invoice of the order (optionally only one kind). The
 * record flips to CANCELLED first so the EXPIRED webhook that follows our own
 * expire call is ignored instead of auto-cancelling the order.
 */
async function cancelPendingInvoices(orderId: string, kinds?: PaymentKind[]) {
  const pending = await paymentRepository.listByOrderAndStatus(orderId, [
    'PENDING'
  ]);
  for (const payment of pending) {
    if (kinds && !kinds.includes(payment.kind)) continue;
    const claimed = await paymentRepository.transition(
      String(payment._id),
      ['PENDING'],
      'CANCELLED'
    );
    if (!claimed) continue;
    try {
      await xenditService.expireInvoice(payment.xenditInvoiceId);
    } catch (error) {
      // Already paid/expired at Xendit, or a network blip. A PAID webhook for
      // a CANCELLED record is still accepted (see applyPaid) so no money is
      // ever ignored.
      console.error(
        `[payment] could not expire invoice ${payment.xenditInvoiceId}`,
        error
      );
    }
  }
}

async function recomputeRefundStatus(orderId: string) {
  const payments = await paymentRepository.listByOrderId(orderId);
  const statuses = payments.map(p => p.status);
  let refundStatus: 'none' | 'pending' | 'refunded' | 'failed' = 'none';
  if (statuses.includes('REFUND_FAILED')) refundStatus = 'failed';
  else if (statuses.includes('REFUND_PENDING')) refundStatus = 'pending';
  else if (statuses.includes('REFUNDED')) refundStatus = 'refunded';
  await orderRepository.updateFields(orderId, {refundStatus});
  return refundStatus;
}

async function refundPayment(payment: PaymentDocument, reason: string) {
  const referenceId = `DC-REFUND-${String(payment._id)}`;
  const claimed = await paymentRepository.transition(
    String(payment._id),
    ['PAID'],
    'REFUND_PENDING'
  );
  if (!claimed) return;

  try {
    const refund = await xenditService.createRefund({
      invoiceId: payment.xenditInvoiceId,
      referenceId,
      amount: payment.charge
    });
    const status =
      refund.status === 'SUCCEEDED'
        ? 'REFUNDED'
        : refund.status === 'FAILED'
          ? 'REFUND_FAILED'
          : 'REFUND_PENDING';
    await paymentRepository.transition(
      String(payment._id),
      ['REFUND_PENDING'],
      status,
      {
        refundId: refund.id,
        refundedAt: status === 'REFUNDED' ? new Date() : null
      }
    );
    console.info(
      `[audit] refund ${refund.id} (${refund.status}) requested for payment ${String(payment._id)} of order ${String(payment.orderId)}: ${reason}`
    );
  } catch (error) {
    console.error(
      `[payment] refund failed for payment ${String(payment._id)}`,
      error
    );
    await paymentRepository.transition(
      String(payment._id),
      ['REFUND_PENDING'],
      'REFUND_FAILED'
    );
  }

  const orderId = String(payment.orderId);
  const refundStatus = await recomputeRefundStatus(orderId);
  if (refundStatus === 'failed') {
    await notifyAdmins(
      'Refund failed',
      `The automatic refund of ${peso(payment.charge)} for order #${orderCode(orderId)} failed. Please refund the customer from the Xendit dashboard.`,
      orderId
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type QuoteMap = Record<PaymentChannel, PaymentQuote>;

function quotesFor(amount: number): QuoteMap {
  return Object.fromEntries(
    PAYMENT_CHANNELS.map(channel => [channel, computeCharge(amount, channel)])
  ) as QuoteMap;
}

export const paymentService = {
  isConfigured: isXenditConfigured,

  /**
   * Everything the tracking page needs to render the payment step: what is
   * due, which options are allowed, per-channel fee quotes, the open invoice,
   * and the payment history.
   */
  async getSummary(order: OrderDocument) {
    const orderId = String(order._id);
    const payments = await paymentRepository.listByOrderId(orderId);
    const allowsDownPayment = await orderAllowsDownPayment(order);
    const total = order.totalAmount;
    const amountPaid = order.amountPaid ?? 0;
    const balanceDue = Math.max(0, total - amountPaid);
    const dp = downPaymentAmount(total);
    const pending = payments.find(p => p.status === 'PENDING') ?? null;

    return {
      configured: isXenditConfigured(),
      totalAmount: total,
      amountPaid,
      balanceDue,
      transactionFee: order.transactionFee ?? 0,
      paymentStatus: order.paymentStatus ?? 'unpaid',
      paymentChoice: order.paymentChoice ?? null,
      balanceChoice: order.balanceChoice ?? null,
      paymentChannel: order.paymentChannel ?? null,
      refundStatus: order.refundStatus ?? 'none',
      // Pre-orders must start with an online payment (down or full); only the
      // balance may be paid in cash, and only when the customer picks it up.
      cashAllowed: order.orderType === 'pickup' && !order.isPreOrder,
      balanceCashAllowed: order.orderType === 'pickup',
      isPreOrder: order.isPreOrder === true,
      pickup: order.preOrder
        ? {
            date: order.preOrder.pickupDate,
            slotLabel: order.preOrder.slotLabel,
            receiveMethod: order.preOrder.receiveMethod
          }
        : null,
      downPaymentAllowed: allowsDownPayment,
      downPaymentAmount: dp,
      channels: PAYMENT_CHANNELS.map(id => ({id, label: PAYMENT_FEES[id].label})),
      quotes: {
        full: quotesFor(total),
        down_payment: allowsDownPayment ? quotesFor(dp) : null,
        balance:
          order.paymentStatus === 'down_payment' ? quotesFor(balanceDue) : null
      },
      pendingPayment: pending
        ? {
            kind: pending.kind,
            channel: pending.channel,
            amount: pending.amount,
            transactionFee: pending.transactionFee,
            charge: pending.charge,
            invoiceUrl: pending.invoiceUrl,
            expiresAt: pending.expiresAt
          }
        : null,
      payments: payments.map(p => ({
        id: String(p._id),
        kind: p.kind,
        channel: p.channel,
        amount: p.amount,
        transactionFee: p.transactionFee,
        charge: p.charge,
        status: p.status,
        paidAt: p.paidAt ?? null,
        createdAt: p.createdAt
      }))
    };
  },

  /** Creates a Xendit invoice and returns its hosted checkout URL. */
  async startCheckout(
    order: OrderDocument,
    kind: PaymentKind,
    channel: PaymentChannel
  ) {
    if (!isXenditConfigured()) {
      throw new ApiError(
        503,
        'PAYMENTS_NOT_CONFIGURED',
        'Online payment is not available yet. Please contact the store.'
      );
    }
    if (order.orderSource === 'in-store') {
      throw new ApiError(400, 'INVALID_OPERATION', 'Counter orders are paid at the register');
    }
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'This order can no longer be paid');
    }

    const orderId = String(order._id);
    const total = order.totalAmount;
    let amount: number;

    if (kind === 'balance') {
      if (order.paymentStatus !== 'down_payment') {
        throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'There is no balance to pay on this order');
      }
      amount = Math.max(0, total - (order.amountPaid ?? 0));
    } else {
      if (order.orderStatus !== 'confirmed') {
        throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'Payment opens once the cashier confirms your order');
      }
      if ((order.paymentStatus ?? 'unpaid') !== 'unpaid') {
        throw new ApiError(409, 'ALREADY_PAID', 'This order is already paid');
      }
      if (kind === 'down_payment') {
        if (!(await orderAllowsDownPayment(order))) {
          throw new ApiError(
            400,
            'DOWN_PAYMENT_NOT_ALLOWED',
            'Orders that include regular products require full payment. Down payments only apply to pre-order products.'
          );
        }
        amount = downPaymentAmount(total);
      } else {
        amount = total;
      }
    }

    if (amount <= 0) {
      throw new ApiError(409, 'NOTHING_DUE', 'Nothing is due on this order');
    }

    // One open invoice per order at a time (switching channel replaces it).
    await cancelPendingInvoices(orderId);

    const quote = computeCharge(amount, channel);
    const hasPreOrder = order.isPreOrder === true || (await getOrderProductFlags(order)).hasPreOrder;
    const durationSeconds =
      hasPreOrder || kind === 'balance'
        ? env.PREORDER_PAYMENT_EXPIRY_HOURS * 3600
        : env.PAYMENT_EXPIRY_MINUTES * 60;

    const label =
      kind === 'down_payment'
        ? 'Down payment'
        : kind === 'balance'
          ? 'Balance'
          : 'Payment';
    const externalId = `DC-${orderId}-${kind}-${Date.now()}`;
    const fullName = order.isGuest
      ? {given: order.guestInfo?.firstName, surname: order.guestInfo?.lastName}
      : {given: undefined, surname: undefined};

    const invoice: XenditInvoice = await xenditService.createInvoice({
      externalId,
      amount: quote.charge,
      orderAmount: quote.amount,
      transactionFee: quote.transactionFee,
      description: `${label} for DonClaudio's order #${orderCode(orderId)}`,
      durationSeconds,
      paymentMethods: [PAYMENT_FEES[channel].xenditCode],
      ...redirectUrls(order),
      customer: order.isGuest
        ? {
            given_names: fullName.given,
            surname: fullName.surname,
            email: order.guestInfo?.email || undefined
          }
        : undefined
    });

    const expiresAt = invoice.expiry_date
      ? new Date(invoice.expiry_date)
      : new Date(Date.now() + durationSeconds * 1000);

    await paymentRepository.create({
      orderId: order._id as any,
      kind,
      channel,
      amount: quote.amount,
      transactionFee: quote.transactionFee,
      charge: quote.charge,
      externalId,
      xenditInvoiceId: invoice.id,
      invoiceUrl: invoice.invoice_url,
      status: 'PENDING',
      expiresAt
    });

    await orderRepository.updateFields(
      orderId,
      kind === 'balance'
        ? {balanceChoice: 'online', paymentExpiresAt: expiresAt}
        : {
            paymentChoice:
              kind === 'down_payment' ? 'online_down_payment' : 'online_full',
            paymentExpiresAt: expiresAt
          }
    );

    console.info(
      `[audit] invoice ${invoice.id} created for order ${orderId} (${kind} via ${channel}, ${peso(quote.charge)})`
    );

    return {invoiceUrl: invoice.invoice_url, expiresAt, ...quote};
  },

  /** Customer chooses to pay the whole order in cash on pickup. */
  async chooseCashOnPickup(order: OrderDocument) {
    if (order.orderSource === 'in-store') {
      throw new ApiError(400, 'INVALID_OPERATION', 'Counter orders are paid at the register');
    }
    if (order.orderStatus !== 'confirmed') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'Payment opens once the cashier confirms your order');
    }
    if (order.orderType !== 'pickup') {
      throw new ApiError(400, 'INVALID_OPERATION', 'Cash payment is only available for pick-up orders');
    }
    if (order.isPreOrder) {
      throw new ApiError(
        400,
        'PREORDER_NEEDS_ONLINE_PAYMENT',
        'Pre-orders need an online down payment or full payment. The balance can be paid in cash on pickup.'
      );
    }
    if ((order.paymentStatus ?? 'unpaid') !== 'unpaid') {
      throw new ApiError(409, 'ALREADY_PAID', 'This order is already paid');
    }

    const orderId = String(order._id);
    await cancelPendingInvoices(orderId);
    await orderRepository.updateFields(orderId, {
      paymentChoice: 'cash_on_pickup',
      paymentMethod: 'cash',
      paymentExpiresAt: null
    });
    await transactionRepository.updateByOrderId(orderId, {
      paymentMethod: 'cash',
      totalAmount: order.totalAmount
    });
    await notifyStaff(
      'Cash on pickup',
      `Order #${orderCode(orderId)} will be paid in cash on pickup (${peso(order.totalAmount)}). You can start preparing it.`,
      orderId
    );
  },

  /** After a down payment, the customer settles the balance in cash on pickup. */
  async chooseCashBalance(order: OrderDocument) {
    if (order.paymentStatus !== 'down_payment') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'There is no balance to pay on this order');
    }
    if (order.orderType !== 'pickup') {
      throw new ApiError(
        400,
        'INVALID_OPERATION',
        'Cash is only available for pick-up orders. Please pay the balance online.'
      );
    }
    const orderId = String(order._id);
    await cancelPendingInvoices(orderId, ['balance']);
    await orderRepository.updateFields(orderId, {
      balanceChoice: 'cash',
      paymentExpiresAt: null
    });
    const balance = Math.max(0, order.totalAmount - (order.amountPaid ?? 0));
    await notifyStaff(
      'Balance in cash',
      `The ${peso(balance)} balance of order #${orderCode(orderId)} will be paid in cash on pickup.`,
      orderId
    );
  },

  /** Xendit invoice callback (PAID / SETTLED / EXPIRED). */
  async handleInvoiceWebhook(body: any) {
    const invoiceId = typeof body?.id === 'string' ? body.id : null;
    if (!invoiceId) return {ignored: 'missing id'};

    const payment = await paymentRepository.findByInvoiceId(invoiceId);
    if (!payment) {
      console.warn(`[payment] webhook for unknown invoice ${invoiceId}`);
      return {ignored: 'unknown invoice'};
    }

    // Never trust the body alone: re-read the invoice from Xendit.
    const invoice = await xenditService.getInvoice(invoiceId);

    if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
      await applyPaid(payment, invoice);
      return {ok: true};
    }
    if (invoice.status === 'EXPIRED') {
      await applyExpired(payment);
      return {ok: true};
    }
    return {ignored: `status ${invoice.status}`};
  },

  /** Xendit refund callback (refund.succeeded / refund.failed). */
  async handleRefundWebhook(body: any) {
    const event: string | undefined = body?.event;
    const data = body?.data ?? {};
    const refundId: string | undefined = data.id;
    const referenceId: string | undefined = data.reference_id;

    let payment = refundId ? await paymentRepository.findByRefundId(refundId) : null;
    if (!payment && referenceId?.startsWith('DC-REFUND-')) {
      // The refund webhook can arrive before we stored the refund id.
      payment = await paymentRepository
        .findById(referenceId.slice('DC-REFUND-'.length))
        .catch(() => null);
    }
    if (!payment) {
      console.warn(`[payment] refund webhook for unknown refund ${refundId}`);
      return {ignored: 'unknown refund'};
    }

    const succeeded =
      event === 'refund.succeeded' || data.status === 'SUCCEEDED';
    const failed = event === 'refund.failed' || data.status === 'FAILED';
    if (!succeeded && !failed) return {ignored: `event ${event}`};

    await paymentRepository.transition(
      String(payment._id),
      ['REFUND_PENDING', 'REFUND_FAILED'],
      succeeded ? 'REFUNDED' : 'REFUND_FAILED',
      {
        refundId: refundId ?? payment.refundId ?? null,
        refundedAt: succeeded ? new Date() : null
      }
    );

    const orderId = String(payment.orderId);
    const refundStatus = await recomputeRefundStatus(orderId);
    const order = await orderRepository.findById(orderId);
    if (succeeded && order) {
      await notifyCustomer(
        order,
        'Refund completed',
        `We refunded ${peso(payment.charge)} for order #${orderCode(orderId)} to your original payment method.`
      );
    }
    if (refundStatus === 'failed') {
      await notifyAdmins(
        'Refund failed',
        `The automatic refund of ${peso(payment.charge)} for order #${orderCode(orderId)} failed. Please refund the customer from the Xendit dashboard.`,
        orderId
      );
    }
    return {ok: true};
  },

  /**
   * Called whenever an online order is cancelled: closes open invoices and
   * refunds everything already paid online. Safe to call more than once.
   */
  async handleOrderCancelled(orderId: string, reason = 'Order cancelled') {
    await cancelPendingInvoices(orderId);
    const paid = await paymentRepository.listByOrderAndStatus(orderId, ['PAID']);
    if (paid.length === 0) return;
    if (!isXenditConfigured()) {
      await orderRepository.updateFields(orderId, {refundStatus: 'failed'});
      await notifyAdmins(
        'Refund needed',
        `Order #${orderCode(orderId)} was cancelled after being paid online, but Xendit is not configured. Please refund the customer manually.`,
        orderId
      );
      return;
    }
    for (const payment of paid) {
      await refundPayment(payment, reason);
    }
  },

  /**
   * Status gate for ONLINE orders. Throws PAYMENT_REQUIRED when the cashier
   * tries to move an order forward before the money rules allow it.
   */
  assertPaymentAllowsStatus(order: OrderDocument, next: OrderStatus) {
    if (order.orderSource === 'in-store') return;
    if (order.orderStatus === 'completed') return;
    if (!['preparing', 'ready', 'on_the_way', 'completed'].includes(next)) return;

    const status = order.paymentStatus ?? 'unpaid';
    const cashPickup = order.paymentChoice === 'cash_on_pickup';

    if (next === 'preparing' || next === 'ready') {
      if (status === 'paid' || status === 'down_payment' || cashPickup) return;
      throw new ApiError(
        409,
        'PAYMENT_REQUIRED',
        'Wait for the customer to pay online before preparing this order'
      );
    }

    if (next === 'on_the_way') {
      if (status === 'paid') return;
      throw new ApiError(
        409,
        'PAYMENT_REQUIRED',
        status === 'down_payment'
          ? 'The customer still has to pay the balance online before delivery'
          : 'This order is not paid yet'
      );
    }

    // completed
    if (status === 'paid') return;
    const cashDue =
      cashPickup || (status === 'down_payment' && order.balanceChoice === 'cash');
    throw new ApiError(
      409,
      'PAYMENT_REQUIRED',
      cashDue
        ? 'Mark the cash as received before completing this order'
        : 'The customer still has to pay the balance before completing this order'
    );
  }
};

// ---------------------------------------------------------------------------
// Webhook appliers
// ---------------------------------------------------------------------------

async function applyPaid(payment: PaymentDocument, invoice: XenditInvoice) {
  const paidAmount = Number(invoice.paid_amount ?? invoice.amount ?? 0);
  if (paidAmount < payment.charge) {
    console.error(
      `[payment] invoice ${invoice.id} paid ${paidAmount} but expected ${payment.charge}; not applied`
    );
    await notifyAdmins(
      'Payment amount mismatch',
      `Xendit invoice ${invoice.id} was paid ${peso(paidAmount)} but ${peso(payment.charge)} was expected. Please check it in the Xendit dashboard.`,
      String(payment.orderId)
    );
    return;
  }

  // CANCELLED/EXPIRED are accepted too: a customer can finish paying in the
  // same moment we close the invoice, and that money must not be lost.
  const updated = await paymentRepository.transition(
    String(payment._id),
    ['PENDING', 'CANCELLED', 'EXPIRED'],
    'PAID',
    {
      paidAt: invoice.paid_at ? new Date(invoice.paid_at) : new Date(),
      paidChannel: invoice.payment_channel ?? null
    }
  );
  if (!updated) return; // already processed (webhook retry)

  const orderId = String(payment.orderId);
  const order = await orderRepository.findById(orderId);
  if (!order) return;

  // Paid after the order was cancelled: give the money back.
  if (order.orderStatus === 'cancelled') {
    await refundPayment(updated, 'Paid after the order was cancelled');
    return;
  }

  const from = payment.kind === 'balance' ? ['down_payment'] : ['unpaid'];
  const to = payment.kind === 'down_payment' ? 'down_payment' : 'paid';
  const method = channelToMethod(payment.channel);
  const paidAt = updated.paidAt ?? new Date();

  const result = await orderRepository.updatePaymentIfStatus(
    orderId,
    from as any,
    {
      paymentStatus: to,
      paymentMethod: method,
      paymentChannel: payment.channel,
      paymentExpiresAt: null,
      ...(to === 'paid' ? {paidAt} : {})
    },
    {amountPaid: payment.amount, transactionFee: payment.transactionFee}
  );

  if (result.modifiedCount === 0) {
    // The order was settled another way (e.g. cash received, or a second
    // invoice paid first). Refund this duplicate payment.
    await refundPayment(updated, 'Duplicate payment');
    return;
  }

  await transactionRepository.updateByOrderId(orderId, {
    paymentMethod: method,
    totalAmount: order.totalAmount
  });

  const what =
    payment.kind === 'down_payment'
      ? `a ${peso(payment.amount)} down payment`
      : payment.kind === 'balance'
        ? `the ${peso(payment.amount)} balance`
        : `${peso(payment.amount)} in full`;
  console.info(
    `[audit] order ${orderId} paid ${what} via ${payment.channel} (invoice ${payment.xenditInvoiceId})`
  );

  await notifyStaff(
    'Payment received',
    `Order #${orderCode(orderId)} paid ${what} via ${PAYMENT_FEES[payment.channel].label}.${
      payment.kind === 'balance' ? '' : ' You can start preparing it.'
    }`,
    orderId
  );
  await notifyCustomer(
    order,
    'Payment received',
    `We received ${what} for order #${orderCode(orderId)}. Thank you!`
  );
}

async function applyExpired(payment: PaymentDocument) {
  const expired = await paymentRepository.transition(
    String(payment._id),
    ['PENDING'],
    'EXPIRED'
  );
  // Not PENDING any more: we cancelled it ourselves, or already handled.
  if (!expired) return;

  const orderId = String(payment.orderId);
  const order = await orderRepository.findById(orderId);
  if (!order) return;

  if (payment.kind === 'balance') {
    await orderRepository.updateFields(orderId, {
      balanceChoice: null,
      paymentExpiresAt: null
    });
    await notifyCustomer(
      order,
      'Balance payment link expired',
      `The payment link for the balance of order #${orderCode(orderId)} expired. Open your order to get a new one or choose cash on pickup.`
    );
    return;
  }

  const stillOpen = await paymentRepository.listByOrderAndStatus(orderId, [
    'PENDING',
    'PAID'
  ]);
  if (
    order.orderStatus !== 'confirmed' ||
    (order.paymentStatus ?? 'unpaid') !== 'unpaid' ||
    order.paymentChoice === 'cash_on_pickup' ||
    stillOpen.length > 0
  ) {
    return;
  }

  await autoCancelUnpaidOrder(order);
}

async function autoCancelUnpaidOrder(order: OrderDocument) {
  const orderId = String(order._id);
  const reason = 'Payment was not completed in time';

  if (order.isPreOrder) {
    await preOrderEventService.releaseForOrder(order);
  } else if (order.stockDeducted) {
    const claim = await orderRepository.claimStockRestore(orderId);
    if (claim.modifiedCount > 0) {
      try {
        // StockMovement.performedBy is an ObjectId: attribute the system
        // cancel to the owner account.
        const admins = (await adminRepository.listAll()) ?? [];
        const actor = admins[0] ? String(admins[0]._id) : String(order._id);
        await stockMovementService.restoreOrderStock(orderId, actor);
      } catch (error) {
        await orderRepository.updateStockDeducted(orderId, true);
        console.error('[payment] failed to restore stock on auto-cancel', error);
      }
    }
  }

  await orderRepository.cancel(orderId, reason);
  await orderRepository.updateFields(orderId, {paymentExpiresAt: null});
  console.info(`[audit] order ${orderId} auto-cancelled: ${reason}`);

  await notifyStaff(
    'Order auto-cancelled',
    `Order #${orderCode(orderId)} was cancelled because the customer did not pay in time.`,
    orderId
  );
  await notifyCustomer(
    order,
    'Order cancelled',
    `Order #${orderCode(orderId)} was cancelled because the payment was not completed in time. You are welcome to order again.`
  );
}
