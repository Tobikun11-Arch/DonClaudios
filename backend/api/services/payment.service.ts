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
import {
  computeRefundPlan,
  type RefundPolicyCase
} from '../config/refundPolicy';
import {ruleApplies, type DownPaymentFlow} from '../config/downPaymentRules';
import {
  inStoreBalanceDueAt,
  inStorePaymentDueAt,
  inStorePaymentOpen
} from '../config/inStorePayment';
import type {
  OrderDocument,
  OrderStatus,
  PaymentChoice
} from '../models/Order.model';
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
import {settingsService} from './settings.service';
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
 *   | in store (cash at the counter, full or 50%, before a deadline; see
 *     config/inStorePayment.ts. A missed deadline auto-cancels the order)
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

/**
 * Which down payment rule (Settings > Payments) an order follows: Holiday
 * pre-orders and carts made only of pre-order products use the pre-order
 * rule; everything else the rule of its order type.
 */
export async function downPaymentFlowOf(order: OrderDocument): Promise<DownPaymentFlow> {
  if (order.isPreOrder) return 'preorder';
  const flags = await getOrderProductFlags(order);
  if (!flags.hasRegular) return 'preorder';
  return order.orderType;
}

/** The order's down payment: whether it may / must pay one, and how much. */
export async function downPaymentInfo(order: OrderDocument) {
  const flow = await downPaymentFlowOf(order);
  const rule = (await settingsService.getDownPaymentRules())[flow];
  const percent = await settingsService.downPaymentPercentFor(order, flow);
  // A down payment already made stays valid whatever the setting says now.
  const allowed =
    order.paymentStatus === 'down_payment' || ruleApplies(rule, order.totalAmount);
  return {
    flow,
    rule,
    percent,
    allowed,
    // "Required" only removes the pay-everything-later option (cash on pick-up).
    required: allowed && rule.mode === 'required',
    amount: downPaymentAmount(order.totalAmount, percent)
  };
}

export async function orderAllowsDownPayment(order: OrderDocument) {
  return (await downPaymentInfo(order)).allowed;
}

/** Down payment percent of an order (live while unpaid, else the one paid with). */
export async function downPaymentPercentOf(order: OrderDocument) {
  return (await downPaymentInfo(order)).percent;
}

const DOWN_PAYMENT_NOT_ALLOWED_MESSAGE =
  'A down payment is not available for this order. Please pay the full amount.';

export function isInStoreChoice(choice?: PaymentChoice | null) {
  return choice === 'in_store_full' || choice === 'in_store_down_payment';
}

/** When the store confirmed the order (start of the in-store deadline). */
function confirmedAtOf(order: OrderDocument) {
  const entry = [...(order.statusHistory ?? [])]
    .reverse()
    .find(h => h.status === 'confirmed');
  return entry?.at ? new Date(entry.at) : new Date(order.updatedAt ?? Date.now());
}

/**
 * In-store payment for this order: the deadline (stored once chosen, else
 * what it would be) and whether it may still be chosen.
 */
async function inStoreInfo(order: OrderDocument) {
  const isPreOrderCart =
    order.isPreOrder === true || (await getOrderProductFlags(order)).hasPreOrder;
  const pickupAt = order.preOrder?.pickupAt ? new Date(order.preOrder.pickupAt) : null;
  const chosen = isInStoreChoice(order.paymentChoice) && order.paymentExpiresAt;
  const dueAt = chosen
    ? new Date(order.paymentExpiresAt as Date)
    : inStorePaymentDueAt({confirmedAt: confirmedAtOf(order), isPreOrderCart, pickupAt});
  const open = inStorePaymentOpen(dueAt);
  return {
    allowed: open,
    dueAt,
    isPreOrderCart,
    hasPickupDate: pickupAt !== null,
    reason: open
      ? null
      : pickupAt
        ? 'It is too close to your pickup date to pay in store. Please pay online.'
        : 'The time to pay in store has passed. Please pay online.'
  };
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
  // Pre-orders: owner + cashiers, linked to their Pre-orders tabs.
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
  const order = await orderRepository.findById(orderId);
  const cashDue = order?.cashRefundDue ?? 0;
  const cashPending = cashDue > 0 && !order?.cashRefundedAt;
  const cashDone = cashDue > 0 && !!order?.cashRefundedAt;
  const statuses = payments.map(p => p.status);
  let refundStatus: 'none' | 'pending' | 'refunded' | 'failed' = 'none';
  if (statuses.includes('REFUND_FAILED')) refundStatus = 'failed';
  else if (statuses.includes('REFUND_PENDING') || cashPending) refundStatus = 'pending';
  else if (statuses.includes('REFUNDED') || cashDone) refundStatus = 'refunded';
  await orderRepository.updateFields(orderId, {refundStatus});
  return refundStatus;
}

async function refundPayment(
  payment: PaymentDocument,
  reason: string,
  amount: number = payment.charge
) {
  const referenceId = `DC-REFUND-${String(payment._id)}`;
  const refundAmount = Math.min(payment.charge, Math.max(0, amount));
  if (refundAmount <= 0) return;
  const claimed = await paymentRepository.transition(
    String(payment._id),
    ['PAID'],
    'REFUND_PENDING',
    {refundAmount}
  );
  if (!claimed) return;

  try {
    const refund = await xenditService.createRefund({
      invoiceId: payment.xenditInvoiceId,
      referenceId,
      amount: refundAmount
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
      `The automatic refund of ${peso(refundAmount)} for order #${orderCode(orderId)} failed. Please refund the customer from the Xendit dashboard.`,
      orderId
    );
  }
}

/** Order amount + fee of every PAID online payment (what a refund draws on). */
async function paidOnlinePayments(orderId: string) {
  return paymentRepository.listByOrderAndStatus(orderId, ['PAID']);
}

async function buildRefundPlan(order: OrderDocument, policy: RefundPolicyCase) {
  const paid = await paidOnlinePayments(String(order._id));
  return computeRefundPlan({
    policy,
    // A late cancellation keeps this order's down payment share.
    retainedPercent: await downPaymentPercentOf(order),
    totalAmount: order.totalAmount,
    amountPaid: order.amountPaid ?? 0,
    onlinePayments: paid.map(p => ({
      id: String(p._id),
      amount: p.amount,
      transactionFee: p.transactionFee
    }))
  });
}

/** Early (on/before the date's cut-off) or late, for a customer cancellation. */
export function customerCancelPolicy(
  order: OrderDocument,
  at: Date = new Date()
): RefundPolicyCase {
  if (!order.isPreOrder || !order.preOrder) return 'early';
  return at.getTime() > new Date(order.preOrder.cancelDeadline).getTime()
    ? 'late'
    : 'early';
}

/**
 * Whether staff may cancel the order as a no-show (the store keeps the down
 * payment): something was paid, and the customer is now late, i.e. the
 * order is ready / out for delivery, or a pre-order's pickup time passed.
 */
export function noShowAllowed(
  order: OrderDocument,
  now: Date = new Date()
): {allowed: boolean; reason: string | null} {
  if (order.orderSource === 'in-store') {
    return {allowed: false, reason: 'Counter orders cannot be marked as no-show'};
  }
  if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
    return {allowed: false, reason: 'This order is already closed'};
  }
  if ((order.amountPaid ?? 0) <= 0) {
    return {allowed: false, reason: 'Nothing was paid yet, so there is nothing to keep'};
  }
  if (order.isPreOrder && order.preOrder?.pickupAt) {
    return now.getTime() >= new Date(order.preOrder.pickupAt).getTime()
      ? {allowed: true, reason: null}
      : {allowed: false, reason: 'Available once the pickup time has passed'};
  }
  return order.orderStatus === 'ready' || order.orderStatus === 'on_the_way'
    ? {allowed: true, reason: null}
    : {allowed: false, reason: 'Available once the order is ready'};
}

const POLICY_LABEL: Record<RefundPolicyCase, string> = {
  early: 'cancelled before the cut-off: full refund of the order amount',
  late: 'late cancellation: the 50% down payment is kept',
  store: 'cancelled by the store: full refund including service fees',
  no_show: 'you did not show up: the store keeps the down payment'
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type QuoteMap = Record<PaymentChannel, PaymentQuote>;

function quotesFor(amount: number): QuoteMap {
  return Object.fromEntries(
    PAYMENT_CHANNELS.map(channel => [channel, computeCharge(amount, channel)])
  ) as QuoteMap;
}

const INVOICE_CHECK_INTERVAL_MS = 4000;
/** invoiceId -> last time we asked Xendit about it (ms). */
const lastInvoiceCheck = new Map<string, number>();

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
    const dpInfo = await downPaymentInfo(order);
    const allowsDownPayment = dpInfo.allowed;
    const total = order.totalAmount;
    const amountPaid = order.amountPaid ?? 0;
    const balanceDue = Math.max(0, total - amountPaid);
    const dpPercent = dpInfo.percent;
    const dp = dpInfo.amount;
    const pending = payments.find(p => p.status === 'PENDING') ?? null;
    const inStore = await inStoreInfo(order);

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
      refund: order.refund ?? null,
      cashRefundDue: order.cashRefundDue ?? 0,
      cashRefundedAt: order.cashRefundedAt ?? null,
      cancelRequest: order.cancelRequest ?? null,
      // Pre-orders must start with an online payment (down or full); only the
      // balance may be paid in cash, and only when the customer picks it up.
      // A required down payment removes cash on pick-up, except for customers
      // who had already chosen it before the owner changed the setting.
      cashAllowed:
        order.orderType === 'pickup' &&
        !order.isPreOrder &&
        (!dpInfo.required || order.paymentChoice === 'cash_on_pickup'),
      balanceCashAllowed: order.orderType === 'pickup' || order.orderType === 'reservation',
      isPreOrder: order.isPreOrder === true,
      pickup: order.preOrder
        ? {
            date: order.preOrder.pickupDate,
            slotLabel: order.preOrder.slotLabel,
            receiveMethod: order.preOrder.receiveMethod
          }
        : null,
      inStore: {
        allowed: inStore.allowed,
        dueAt: inStore.dueAt,
        isPreOrderCart: inStore.isPreOrderCart,
        hasPickupDate: inStore.hasPickupDate,
        reason: inStore.reason
      },
      // Balance after a down payment, in cash at the counter (any order type).
      balanceInStore:
        order.paymentStatus === 'down_payment'
          ? {
              dueAt:
                order.balanceChoice === 'in_store' && order.paymentExpiresAt
                  ? order.paymentExpiresAt
                  : inStoreBalanceDueAt(order.preOrder?.pickupAt ?? null)
            }
          : null,
      downPaymentAllowed: allowsDownPayment,
      downPaymentRequired: dpInfo.required,
      downPaymentFlow: dpInfo.flow,
      downPaymentAmount: dp,
      downPaymentPercent: dpPercent,
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
        refundAmount: p.refundAmount ?? null,
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
      const dpInfo = await downPaymentInfo(order);
      if (kind === 'down_payment') {
        if (!dpInfo.allowed) {
          throw new ApiError(400, 'DOWN_PAYMENT_NOT_ALLOWED', DOWN_PAYMENT_NOT_ALLOWED_MESSAGE);
        }
        amount = dpInfo.amount;
      } else {
        amount = total;
      }
      // Pin the percent this payment is made with (late cancellations and
      // no-shows keep this share).
      await orderRepository.updateFields(orderId, {downPaymentPercent: dpInfo.percent});
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
    const dpInfo = await downPaymentInfo(order);
    if (dpInfo.required && order.paymentChoice !== 'cash_on_pickup') {
      throw new ApiError(
        400,
        'DOWN_PAYMENT_REQUIRED',
        `This order needs a ${dpInfo.percent}% down payment first. You can pay the rest in cash on pick-up.`
      );
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

  /**
   * Customer will pay in cash at the store counter (full or 50% down payment)
   * before the deadline. No Xendit invoice; the cashier marks it received.
   */
  async chooseInStore(order: OrderDocument, kind: 'full' | 'down_payment') {
    if (order.orderSource === 'in-store') {
      throw new ApiError(400, 'INVALID_OPERATION', 'Counter orders are paid at the register');
    }
    if (order.orderStatus !== 'confirmed') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'Payment opens once the cashier confirms your order');
    }
    if ((order.paymentStatus ?? 'unpaid') !== 'unpaid') {
      throw new ApiError(409, 'ALREADY_PAID', 'This order is already paid');
    }
    const dpInfo = await downPaymentInfo(order);
    if (kind === 'down_payment' && !dpInfo.allowed) {
      throw new ApiError(400, 'DOWN_PAYMENT_NOT_ALLOWED', DOWN_PAYMENT_NOT_ALLOWED_MESSAGE);
    }
    const info = await inStoreInfo(order);
    if (!info.allowed) {
      throw new ApiError(409, 'IN_STORE_CLOSED', info.reason ?? 'In-store payment is no longer available');
    }

    const orderId = String(order._id);
    await cancelPendingInvoices(orderId);
    await orderRepository.updateFields(orderId, {
      paymentChoice: kind === 'down_payment' ? 'in_store_down_payment' : 'in_store_full',
      // Re-choosing never extends the deadline: it is fixed from confirmation.
      paymentExpiresAt: info.dueAt
    });
    const amount = kind === 'down_payment' ? dpInfo.amount : order.totalAmount;
    const due = info.dueAt.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    console.info(
      `[audit] order ${orderId} will pay ${peso(amount)} in store (${kind}) by ${info.dueAt.toISOString()}`
    );
    await notifyStaff(
      'Paying in store',
      `Order #${orderCode(orderId)} will pay ${peso(amount)}${kind === 'down_payment' ? ` (${dpInfo.percent}% down payment)` : ''} in cash at the store by ${due}. Mark it received when they pay.`,
      orderId
    );
  },

  /**
   * Auto-cancels the order when its in-store payment deadline has passed
   * unpaid. Returns true when it cancelled. Safe to call repeatedly.
   */
  async expireInStoreIfDue(order: OrderDocument, now: Date = new Date()) {
    if (
      order.orderStatus !== 'confirmed' ||
      (order.paymentStatus ?? 'unpaid') !== 'unpaid' ||
      !isInStoreChoice(order.paymentChoice) ||
      !order.paymentExpiresAt ||
      new Date(order.paymentExpiresAt).getTime() > now.getTime()
    ) {
      return false;
    }
    // Atomic claim so two pollers cannot cancel (and notify) twice.
    const claim = await orderRepository.claimInStoreExpiry(String(order._id), now);
    if (claim.modifiedCount === 0) return false;
    await autoCancelUnpaidOrder(order, 'In-store payment was not made before the deadline');
    return true;
  },

  /** Sweeps every overdue in-store payment (called from the overdue check). */
  async expireOverdueInStorePayments(now: Date = new Date()) {
    const due = await orderRepository.listPaginated(
      {
        orderStatus: 'confirmed',
        paymentStatus: 'unpaid',
        paymentChoice: {$in: ['in_store_full', 'in_store_down_payment']},
        paymentExpiresAt: {$lte: now}
      },
      1,
      0
    );
    let cancelled = 0;
    for (const order of due) {
      try {
        if (await paymentService.expireInStoreIfDue(order, now)) cancelled++;
      } catch (error) {
        console.error(`[payment] in-store expiry failed for ${String(order._id)}`, error);
      }
    }
    return cancelled;
  },

  /** After a down payment, the customer pays the balance in cash at the store. */
  async chooseInStoreBalance(order: OrderDocument) {
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'This order can no longer be paid');
    }
    if (order.paymentStatus !== 'down_payment') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'There is no balance to pay on this order');
    }
    const orderId = String(order._id);
    await cancelPendingInvoices(orderId, ['balance']);
    const dueAt = inStoreBalanceDueAt(order.preOrder?.pickupAt ?? null);
    await orderRepository.updateFields(orderId, {
      balanceChoice: 'in_store',
      paymentExpiresAt: dueAt
    });
    const balance = Math.max(0, order.totalAmount - (order.amountPaid ?? 0));
    await notifyStaff(
      'Balance in store',
      `The ${peso(balance)} balance of order #${orderCode(orderId)} will be paid in cash at the store${
        dueAt
          ? ` by ${dueAt.toLocaleString('en-PH', {timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}`
          : ''
      }. Do not release it until it is paid.`,
      orderId
    );
  },

  /** After a down payment, the customer settles the balance in cash on pickup. */
  async chooseCashBalance(order: OrderDocument) {
    if (order.paymentStatus !== 'down_payment') {
      throw new ApiError(409, 'PAYMENT_NOT_OPEN', 'There is no balance to pay on this order');
    }
    if (order.orderType !== 'pickup' && order.orderType !== 'reservation') {
      throw new ApiError(
        400,
        'INVALID_OPERATION',
        'Cash is only available for pick-up and reservation orders. Please pay the balance online.'
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
      `The ${peso(balance)} balance of order #${orderCode(orderId)} will be paid in cash ${order.orderType === 'reservation' ? 'at the store' : 'on pickup'}.`,
      orderId
    );
  },

  /** Xendit invoice callback (PAID / SETTLED / EXPIRED). */
  /**
   * Fallback for a missed webhook (local dev without a tunnel, backend down
   * when Xendit called, wrong webhook URL): ask Xendit for each PENDING
   * invoice's real status and apply it, exactly as the webhook would.
   * Throttled per invoice so the 3-5 s polling doesn't hammer Xendit.
   * Returns true when something changed, so callers reload the order.
   */
  async syncPendingFromXendit(orderId: string): Promise<boolean> {
    if (!isXenditConfigured()) return false;
    const payments = await paymentRepository.listByOrderId(orderId);
    const pending = payments.filter(p => p.status === 'PENDING');
    let changed = false;
    for (const payment of pending) {
      const invoiceId = payment.xenditInvoiceId;
      const last = lastInvoiceCheck.get(invoiceId) ?? 0;
      if (Date.now() - last < INVOICE_CHECK_INTERVAL_MS) continue;
      lastInvoiceCheck.set(invoiceId, Date.now());
      try {
        const invoice = await xenditService.getInvoice(invoiceId);
        if (invoice.status === 'PAID' || invoice.status === 'SETTLED') {
          await applyPaid(payment, invoice);
          changed = true;
        } else if (invoice.status === 'EXPIRED') {
          await applyExpired(payment);
          changed = true;
        }
      } catch (err) {
        console.warn(`[payment] could not check invoice ${invoiceId}:`, err);
      }
    }
    return changed;
  },

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
        `We refunded ${peso(payment.refundAmount ?? payment.charge)} for order #${orderCode(orderId)} to your original payment method.`
      );
    }
    if (refundStatus === 'failed') {
      await notifyAdmins(
        'Refund failed',
        `The automatic refund of ${peso(payment.refundAmount ?? payment.charge)} for order #${orderCode(orderId)} failed. Please refund the customer from the Xendit dashboard.`,
        orderId
      );
    }
    return {ok: true};
  },

  /**
   * Called whenever an online order is cancelled: closes open invoices and
   * refunds everything already paid online. Safe to call more than once.
   */
  async handleOrderCancelled(
    orderId: string,
    reason = 'Order cancelled',
    policy: RefundPolicyCase = 'store'
  ) {
    await cancelPendingInvoices(orderId);
    const order = await orderRepository.findById(orderId);
    if (!order) return;
    // Decided once: a repeated call must not re-plan on the leftover payments.
    if (order.refund) return;

    const plan = await buildRefundPlan(order, policy);
    if (plan.paid <= 0 && plan.onlineTotal <= 0) return;

    await orderRepository.updateFields(orderId, {
      refund: {
        policy: plan.policy,
        paid: plan.paid,
        retained: plan.retained,
        onlineTotal: plan.onlineTotal,
        cash: plan.cash,
        feesRefunded: plan.feesRefunded,
        feesNotRefunded: plan.feesNotRefunded,
        refundTotal: plan.refundTotal,
        decidedAt: new Date()
      },
      cashRefundDue: plan.cash
    });
    console.info(
      `[audit] refund plan for order ${orderId} (${plan.policy}): online ${plan.onlineTotal}, cash ${plan.cash}, retained ${plan.retained}`
    );

    if (plan.online.length > 0) {
      if (!isXenditConfigured()) {
        await orderRepository.updateFields(orderId, {refundStatus: 'failed'});
        await notifyAdmins(
          'Refund needed',
          `Order #${orderCode(orderId)} was cancelled after being paid online, but Xendit is not configured. Please refund ${peso(plan.onlineTotal)} manually.`,
          orderId
        );
      } else {
        const paid = await paidOnlinePayments(orderId);
        for (const entry of plan.online) {
          const payment = paid.find(p => String(p._id) === entry.paymentId);
          if (payment) await refundPayment(payment, reason, entry.amount);
        }
      }
    }
    if (plan.cash > 0) {
      await notifyStaff(
        'Cash refund due',
        `Order #${orderCode(orderId)} was cancelled. Hand back ${peso(plan.cash)} in cash when the customer comes to the store, then mark it as refunded.`,
        orderId
      );
    }
    await recomputeRefundStatus(orderId);

    const parts: string[] = [];
    if (plan.onlineTotal > 0) parts.push(`${peso(plan.onlineTotal)} to your original payment method`);
    if (plan.cash > 0) parts.push(`${peso(plan.cash)} in cash at the store`);
    await notifyCustomer(
      order,
      'Refund for your cancelled order',
      parts.length > 0
        ? `Order #${orderCode(orderId)} (${POLICY_LABEL[plan.policy]}). We are refunding ${parts.join(' and ')}.`
        : `Order #${orderCode(orderId)} (${POLICY_LABEL[plan.policy]}). Under our refund policy no amount is refunded.`
    );
  },

  /**
   * What cancelling would do right now: whether the customer may cancel,
   * must ask, or cannot, and the refund the policy gives.
   */
  async quoteCancellation(order: OrderDocument, by: 'customer' | 'store' | 'no_show') {
    const now = new Date();
    const open = order.orderStatus !== 'cancelled' && order.orderStatus !== 'completed';
    let mode: 'cancel' | 'request' | 'requested' | 'closed' = 'closed';
    let policy: RefundPolicyCase = 'store';
    const noShow = noShowAllowed(order, now);

    if (by === 'no_show') {
      mode = noShow.allowed ? 'cancel' : 'closed';
      policy = 'no_show';
    } else if (by === 'store') {
      mode = open ? 'cancel' : 'closed';
    } else if (!order.isPreOrder || !order.preOrder) {
      mode = open && order.orderStatus === 'pending' ? 'cancel' : 'closed';
      policy = 'early';
    } else if (open) {
      policy = customerCancelPolicy(order, now);
      if (policy === 'early') mode = 'cancel';
      else if (order.cancelRequest?.status === 'pending') mode = 'requested';
      else if (now.getTime() < new Date(order.preOrder.pickupAt).getTime()) mode = 'request';
    }

    const plan = await buildRefundPlan(order, policy);
    return {
      mode,
      plan,
      cancelDeadline: order.preOrder?.cancelDeadline ?? null,
      pickupAt: order.preOrder?.pickupAt ?? null,
      noShow,
      cancelRequest: order.cancelRequest ?? null
    };
  },

  /** Customer asks to cancel a pre-order after its cut-off. */
  async requestCancellation(order: OrderDocument, reason?: string) {
    if (!order.isPreOrder || !order.preOrder) {
      throw new ApiError(400, 'INVALID_OPERATION', 'Only pre-orders can be cancelled by request');
    }
    if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
      throw new ApiError(400, 'INVALID_OPERATION', 'Order can no longer be cancelled');
    }
    if (new Date() >= new Date(order.preOrder.pickupAt)) {
      throw new ApiError(400, 'CANCEL_WINDOW_CLOSED', 'The pickup time has passed. Please contact the store.');
    }
    if (order.cancelRequest?.status === 'pending') {
      throw new ApiError(409, 'ALREADY_REQUESTED', 'You already asked to cancel this pre-order');
    }
    if (order.cancelRequest?.status === 'declined') {
      throw new ApiError(409, 'REQUEST_DECLINED', 'The store already declined a cancellation for this pre-order. Please contact the store.');
    }
    const orderId = String(order._id);
    await orderRepository.updateFields(orderId, {
      cancelRequest: {
        status: 'pending',
        reason: reason ?? null,
        requestedAt: new Date(),
        decidedAt: null,
        decidedBy: null,
        note: null
      }
    });
    const plan = await buildRefundPlan(order, 'late');
    await notifyOwners({
      type: 'order_status',
      title: 'Cancellation request',
      message: `Pre-order #${orderCode(orderId)} asks to cancel after the cut-off.${reason ? ` Reason: ${reason}.` : ''} If approved: refund ${peso(plan.refundTotal)}, keep ${peso(plan.retained)}.`,
      orderId,
      link: '/owner/dashboard?tab=preorders'
    });
  },

  /** Owner turns down a late cancellation request; the order goes on. */
  async declineCancelRequest(order: OrderDocument, staffId: string, note?: string) {
    if (order.cancelRequest?.status !== 'pending') {
      throw new ApiError(409, 'NO_REQUEST', 'There is no open cancellation request');
    }
    const orderId = String(order._id);
    await orderRepository.updateFields(orderId, {
      'cancelRequest.status': 'declined',
      'cancelRequest.decidedAt': new Date(),
      'cancelRequest.decidedBy': staffId,
      'cancelRequest.note': note ?? null
    });
    await notifyCustomer(
      order,
      'Cancellation request declined',
      `Your request to cancel pre-order #${orderCode(orderId)} was declined.${note ? ` ${note}` : ''} Your order stays as booked.`
    );
  },

  /** Marks request decided after an approval (the cancel itself runs elsewhere). */
  async markCancelRequestApproved(orderId: string, staffId: string, note?: string) {
    await orderRepository.updateFields(orderId, {
      'cancelRequest.status': 'approved',
      'cancelRequest.decidedAt': new Date(),
      'cancelRequest.decidedBy': staffId,
      'cancelRequest.note': note ?? null
    });
  },

  /** Staff handed the cash refund back at the counter. */
  async markCashRefunded(order: OrderDocument, staffId: string) {
    const due = order.cashRefundDue ?? 0;
    if (order.orderStatus !== 'cancelled' || due <= 0) {
      throw new ApiError(400, 'INVALID_OPERATION', 'There is no cash refund due on this order');
    }
    if (order.cashRefundedAt) {
      throw new ApiError(409, 'ALREADY_REFUNDED', 'The cash refund was already recorded');
    }
    const orderId = String(order._id);
    await orderRepository.updateFields(orderId, {
      cashRefundedAt: new Date(),
      cashRefundedBy: staffId
    });
    await recomputeRefundStatus(orderId);
    console.info(`[audit] cash refund ${due} for order ${orderId} given by ${staffId}`);
    await notifyCustomer(
      order,
      'Cash refund given',
      `We handed back ${peso(due)} in cash for cancelled order #${orderCode(orderId)}.`
    );
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
        isInStoreChoice(order.paymentChoice)
          ? 'Wait for the customer to pay at the store, then mark the cash as received'
          : 'Wait for the customer to pay online before preparing this order'
      );
    }

    if (next === 'on_the_way') {
      if (status === 'paid') return;
      throw new ApiError(
        409,
        'PAYMENT_REQUIRED',
        status === 'down_payment'
          ? order.balanceChoice === 'in_store'
            ? 'The customer still has to pay the balance at the store before delivery'
            : 'The customer still has to pay the balance online before delivery'
          : 'This order is not paid yet'
      );
    }

    // completed
    if (status === 'paid') return;
    const cashDue =
      cashPickup ||
      (status === 'down_payment' &&
        (order.balanceChoice === 'cash' || order.balanceChoice === 'in_store'));
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
    isInStoreChoice(order.paymentChoice) ||
    stillOpen.length > 0
  ) {
    return;
  }

  await autoCancelUnpaidOrder(order);
}

async function autoCancelUnpaidOrder(
  order: OrderDocument,
  reason = 'Payment was not completed in time'
) {
  const orderId = String(order._id);

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
  await orderRepository.updateFields(orderId, {paymentExpiresAt: null, cancelledBy: 'system'});
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
