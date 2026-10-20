import {Request, Response, NextFunction} from 'express';
import mongoose from 'mongoose';
import {ApiError} from '../utils/error';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {productRepository} from '../repositories/product.repository';
import {stockMovementService} from '../services/stockMovement.service';
import {notificationService} from '../services/notification.service';
import {cashierRepository} from '../repositories/cashier.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {sendOrderReceiptEmail} from '../services/receipt.service';
import {storeStatusService} from '../services/storeStatus.service';
import {guestOtpService} from '../services/guestOtp.service';
import {uploadPaymentProofBuffer} from '../services/cloudinary.service';
import {
  buildPrepSnapshot,
  evaluateOrderTiming,
  type OrderPrepTiming
} from '../services/prepTime.service';
import type {PaymentMethod} from '../models/Transaction.model';
import type {
  OrderStatus,
  OrderDocument,
  PaymentStatus
} from '../models/Order.model';
import type {CashierDocument} from '../models/Cashier.model';
import {resolveRange} from '../utils/dateRange';
import {pointsEarnedForOrder} from '../config/rewards';
import {assertPreOrderItemsOrderable} from '../services/cart.service';
import {isPositiveInteger, reserveOrderStock} from '../services/preOrder.service';
import type {ListAllOrdersQuery} from '../dtos/order.dto';

async function notifyCashiersOfNewOrder(orderId: string, totalAmount: number) {
  try {
    const cashiers = (await cashierRepository.listAll()) as
      | (CashierDocument & {_id: unknown})[]
      | null;
    for (const cashier of cashiers ?? []) {
      try {
        await notificationService.createForCashier({
          cashierId: String(cashier._id),
          type: 'new_order',
          title: 'New order',
          message: `A new order (#${String(orderId).slice(-6).toUpperCase()}) worth ₱${totalAmount}.00 has been placed.`,
          orderId: orderId,
          link: '/cashier/dashboard?tab=orders'
        });
      } catch (error) {
        console.error('Failed to create new order cashier notification', error);
      }
    }
  } catch (error) {
    console.error('Failed to notify cashiers of new order', error);
  }
}

async function notifyCashiersOfOrderCancelled(
  orderId: string,
  customerName: string,
  reason?: string
) {
  try {
    const cashiers = (await cashierRepository.listAll()) as
      | (CashierDocument & {_id: unknown})[]
      | null;
    const reasonText = reason ? ` Reason: ${reason}.` : '';
    for (const cashier of cashiers ?? []) {
      try {
        await notificationService.createForCashier({
          cashierId: String(cashier._id),
          type: 'order_status',
          title: 'Order cancelled',
          message: `${customerName} cancelled order (#${String(orderId).slice(-6).toUpperCase()}).${reasonText}`,
          orderId: orderId,
          link: '/cashier/dashboard?tab=orders'
        });
      } catch (error) {
        console.error(
          'Failed to create order cancelled cashier notification',
          error
        );
      }
    }
  } catch (error) {
    console.error('Failed to notify cashiers of cancelled order', error);
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Payment channels the customer can pick when submitting manual payment. Cash
 * is NEVER one of them — cash stays exclusive to the counter (POS) flow, where
 * the cashier selects the method at the register.
 */
const ONLINE_PAYMENT_METHODS = [
  'gcash',
  'maya',
  'bdo',
  'bpi',
  'psbank'
] as const;
type OnlinePaymentMethod = (typeof ONLINE_PAYMENT_METHODS)[number];

const PAYMENT_STATUS_LABELS: Record<Exclude<PaymentStatus, 'unpaid'>, string> = {
  down_payment: 'down payment',
  paid: 'full payment'
};

/**
 * Access rule for payment submission — identical to tracking/cancelling: a
 * guest must know the order's phone number (query or body), an account
 * customer must own the order.
 */
function assertOrderCustomerAccess(
  order: OrderDocument,
  req: Request
): void {
  if (!req.auth) {
    const phoneNumber =
      typeof req.query.phoneNumber === 'string'
        ? req.query.phoneNumber.trim()
        : typeof req.body?.phoneNumber === 'string'
          ? req.body.phoneNumber.trim()
          : '';
    if (
      !phoneNumber ||
      order.isGuest !== true ||
      !order.guestInfo ||
      order.guestInfo.phoneNumber !== phoneNumber
    ) {
      throw new ApiError(403, 'FORBIDDEN', 'Order not found');
    }
  } else if (req.auth.type === 'customer') {
    if (
      order.isGuest ||
      !order.customerId ||
      String(order.customerId) !== req.auth.userId
    ) {
      throw new ApiError(403, 'FORBIDDEN', 'Order not found');
    }
  } else {
    throw new ApiError(403, 'FORBIDDEN', 'Order not found');
  }
}

/**
 * True when at least one line is a regular (non pre-order) product. It drives
 * the payment rules: regular products must be FULLY paid before the kitchen
 * starts; only an order made up entirely of pre-order products may settle for
 * the negotiated down payment instead of the full amount.
 */
async function orderContainsRegularProduct(
  order: OrderDocument
): Promise<boolean> {
  const items = await orderItemRepository.listByOrderIds([String(order._id)]);
  const products = await productRepository.findByIds(
    items.map(item => String(item.productId))
  );
  // Missing/deleted products count as regular — the safe side of the rule.
  return products.length > 0 && products.some(p => p?.isPreOrder !== true);
}

async function notifyCashiersOfPaymentSubmitted(
  orderId: string,
  customerLabel: string,
  statusLabel: string
) {
  try {
    const cashiers = (await cashierRepository.listAll()) as
      | (CashierDocument & {_id: unknown})[]
      | null;
    const orderCode = String(orderId).slice(-6).toUpperCase();
    for (const cashier of cashiers ?? []) {
      try {
        await notificationService.createForCashier({
          cashierId: String(cashier._id),
          type: 'order_status',
          title: 'Payment submitted',
          message: `${customerLabel} submitted proof of a ${statusLabel} for order (#${orderCode}). Verify it before moving the order forward.`,
          orderId,
          link: '/cashier/dashboard?tab=orders'
        });
      } catch (error) {
        console.error(
          'Failed to create payment-submitted cashier notification',
          error
        );
      }
    }
  } catch (error) {
    console.error('Failed to notify cashiers of submitted payment', error);
  }
}

function normalizeChangeFor(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) return undefined;
  return value.trim();
}

/**
 * Fires the "running late" alert. Guarded by an atomic latch on the order so
 * that however many cashiers poll (and however fast), exactly one alert is
 * ever produced. The cashier alert and the customer notice share that claim.
 */
async function notifyOverdueOrder(
  order: OrderDocument,
  timing: OrderPrepTiming
) {
  const now = new Date();
  const claim = await orderRepository.claimOverdueNotification(
    String(order._id),
    now
  );
  if (claim.modifiedCount !== 1) return;

  const orderCode = String(order._id).slice(-6).toUpperCase();
  const estimated = timing.estimatedPrepMinutes ?? 0;
  const lateBy = Math.max(1, Math.abs(timing.minutesRemaining ?? 0));

  try {
    const cashiers = (await cashierRepository.listAll()) as
      | (CashierDocument & {_id: unknown})[]
      | null;
    for (const cashier of cashiers ?? []) {
      try {
        await notificationService.createForCashier({
          cashierId: String(cashier._id),
          type: 'order_overdue',
          title: 'Order running late',
          message: `Order #${orderCode} has been in Preparing for ${lateBy + estimated - 5} min (expected ${estimated} min).`,
          orderId: String(order._id),
          link: '/cashier/dashboard?tab=orders'
        });
      } catch (error) {
        console.error('Failed to create overdue cashier notification', error);
      }
    }
  } catch (error) {
    console.error('Failed to notify cashiers of overdue order', error);
  }

  if (order.customerId) {
    try {
      await notificationService.createForCustomer({
        customerId: String(order.customerId),
        type: 'order_delayed',
        title: "We're running a little behind",
        message: `We're sorry — order #${orderCode} is taking longer than usual to prepare. The kitchen is working on it now and we appreciate your patience!`,
        orderId: String(order._id),
        link: '/customer/dashboard?tab=history'
      });
    } catch (error) {
      console.error('Failed to create delayed customer notification', error);
    }
  }
}

async function assertStoreOpen() {
  const status = await storeStatusService.getStoreStatus();
  if (!status.isOpen) {
    throw new ApiError(
      423,
      'STORE_CLOSED',
      status.isManuallyClosed && status.manualCloseReason
        ? `Store is temporarily closed: ${status.manualCloseReason}`
        : 'Store is currently closed'
    );
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  on_the_way: 'On the Way',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const orderController = {
  async listAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req as Request & {validatedQuery?: ListAllOrdersQuery})
        .validatedQuery ?? {};

      // Filters, count and range are all resolved server-side so the page,
      // total and revenue stay consistent and the expensive item/customer
      // enrichment only touches the orders actually being returned. The cashier
      // polls this endpoint with no params and still gets the full queue.
      const hasRange =
        query.preset !== undefined || query.from !== undefined || query.to !== undefined;
      const range = hasRange
        ? resolveRange({
            preset: query.preset ?? (query.from && query.to ? 'custom' : '7d'),
            from: query.from,
            to: query.to
          })
        : undefined;

      const filter: Record<string, unknown> = {orderSource: {$ne: 'in-store'}};
      if (range) filter.createdAt = {$gte: range.from, $lt: range.to};
      if (query.status) filter.orderStatus = query.status;
      if (query.type) filter.orderType = query.type;

      const paginated = query.page !== undefined && query.limit !== undefined;
      const page = paginated ? query.page! : 1;
      const limit = paginated ? query.limit! : 0;

      const [total, revenueRows, orders, facet] = await Promise.all([
        orderRepository.countByFilter(filter),
        orderRepository.sumRevenue(filter),
        orderRepository.listPaginated(filter, page, limit),
        // Counts ignore the status/type filter so every dropdown option shows
        // its own total. Only requested by the owner page (keeps the cashier
        // poll lean). Base filter keeps the selected date range.
        query.withCounts === 'true'
          ? orderRepository.countsByFilter({orderSource: {$ne: 'in-store'}, ...(range ? {createdAt: {$gte: range.from, $lt: range.to}} : {})})
          : Promise.resolve(undefined)
      ]);
      const totalPages = paginated ? Math.max(1, Math.ceil(total / limit)) : 1;
      const counts = facet?.[0]
        ? {
            status: Object.fromEntries(
              (facet[0].status ?? []).map(entry => [entry._id, entry.count])
            ),
            type: Object.fromEntries(
              (facet[0].type ?? []).map(entry => [entry._id, entry.count])
            )
          }
        : undefined;

      const orderIds = orders.map(order => String(order._id));
      const items = await orderItemRepository.listByOrderIds(orderIds);
      const itemsByOrderId = items.reduce<Record<string, typeof items>>(
        (acc, item) => {
          const orderId = String(item.orderId);
          acc[orderId] = acc[orderId] ?? [];
          acc[orderId].push(item);
          return acc;
        },
        {}
      );

      const customerIds = orders
        .filter(order => order.customerId)
        .map(order => String(order.customerId));
      const customers = await customerRepository.listByIds(customerIds);
      const nameByCustomerId = new Map(
        customers.map(c => [
          String(c._id),
          `${c.firstName} ${c.lastName}`.trim()
        ])
      );

      const transactions = await transactionRepository.listByOrderIds(orderIds);
      const paymentMethodByOrderId = new Map(
        transactions.map(t => [String(t.orderId), t.paymentMethod])
      );

      const now = new Date();
      const overdueOrders: Array<{
        order: OrderDocument;
        timing: OrderPrepTiming;
      }> = [];

      const enriched = orders.map(order => {
        const timing = evaluateOrderTiming(order, now);
        if (timing.isOverdue) {
          overdueOrders.push({order, timing});
        }
        const customerName = order.customerId
          ? nameByCustomerId.get(String(order.customerId))
          : undefined;
        return {
          ...order.toObject(),
          customerName,
          paymentMethod: paymentMethodByOrderId.get(String(order._id)),
          items: itemsByOrderId[String(order._id)] ?? [],
          prepTiming: timing
        };
      });

      // The dashboard polls every 5s, so this is our "scheduler". The atomic
      // latch inside keeps it to one alert per overdue run.
      for (const {order, timing} of overdueOrders) {
        notifyOverdueOrder(order, timing).catch(error =>
          console.error('Failed to process overdue order', error)
        );
      }

      res.json({
        orders: enriched,
        total,
        page,
        limit: paginated ? limit : total,
        totalPages,
        revenue: revenueRows[0]?.revenue ?? 0,
        ...(counts ? {counts} : {})
      });
    } catch (error) {
      next(error);
    }
  },

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      const items = await orderItemRepository.listByOrderIds([String(order._id)]);

      let customerName: string | undefined;
      if (order.customerId) {
        const customers = await customerRepository.listByIds([
          String(order.customerId)
        ]);
        const customer = customers[0];
        if (customer) {
          customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
      }

      const transaction = await transactionRepository.findByOrderId(
        String(order._id)
      );

      res.json({
        order: {
          ...order.toObject(),
          customerName,
          paymentMethod: transaction?.paymentMethod,
          items,
          prepTiming: evaluateOrderTiming(order)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async trackOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (!req.auth) {
        const phoneNumber =
          typeof req.query.phoneNumber === 'string'
            ? req.query.phoneNumber.trim()
            : '';
        if (
          !phoneNumber ||
          order.isGuest !== true ||
          !order.guestInfo ||
          order.guestInfo.phoneNumber !== phoneNumber
        ) {
          throw new ApiError(403, 'FORBIDDEN', 'Order not found');
        }
      } else if (req.auth.type === 'customer') {
        if (
          order.isGuest ||
          !order.customerId ||
          String(order.customerId) !== req.auth.userId
        ) {
          throw new ApiError(403, 'FORBIDDEN', 'Order not found');
        }
      } else {
        throw new ApiError(403, 'FORBIDDEN', 'Order not found');
      }

      const items = await orderItemRepository.listByOrderIds([String(order._id)]);

      let customerName: string | undefined;
      if (order.customerId) {
        const customers = await customerRepository.listByIds([
          String(order.customerId)
        ]);
        const customer = customers[0];
        if (customer) {
          customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
      }

      const transaction = await transactionRepository.findByOrderId(
        String(order._id)
      );

      res.json({
        order: {
          ...order.toObject(),
          customerName,
          paymentMethod: transaction?.paymentMethod,
          items,
          prepTiming: evaluateOrderTiming(order)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (!req.auth) {
        const phoneNumber =
          typeof req.query.phoneNumber === 'string'
            ? req.query.phoneNumber.trim()
            : '';
        if (
          !phoneNumber ||
          order.isGuest !== true ||
          !order.guestInfo ||
          order.guestInfo.phoneNumber !== phoneNumber
        ) {
          throw new ApiError(403, 'FORBIDDEN', 'Order not found');
        }
      } else if (req.auth.type === 'customer') {
        if (
          order.isGuest ||
          !order.customerId ||
          String(order.customerId) !== req.auth.userId
        ) {
          throw new ApiError(403, 'FORBIDDEN', 'Order not found');
        }
      } else {
        throw new ApiError(403, 'FORBIDDEN', 'Order not found');
      }

      const CANCELLABLE = ['pending'];
      if (!CANCELLABLE.includes(order.orderStatus)) {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Order can no longer be cancelled'
        );
      }

      if (order.stockDeducted) {
        // Atomic latch: only the caller that flips the flag actually restores,
        // so a concurrent/retried cancel cannot add the stock twice.
        const claim = await orderRepository.claimStockRestore(String(order._id));
        if (claim.modifiedCount > 0) {
          try {
            await stockMovementService.restoreOrderStock(
              String(order._id),
              (req.auth?.userId as string) ?? 'customer'
            );
          } catch (error) {
            await orderRepository.updateStockDeducted(String(order._id), true);
            throw error;
          }
        }
      }

      const reason =
        typeof req.body?.reason === 'string' && req.body.reason.trim().length > 0
          ? req.body.reason.trim()
          : undefined;

      await orderRepository.cancel(String(order._id), reason);

      console.info(
        `[audit] order ${order._id} cancelled by customer ${req.auth?.userId ?? order.guestInfo?.phoneNumber ?? 'guest'} reason="${reason ?? ''}"`
      );

      const customerName = order.isGuest
        ? [order.guestInfo?.firstName, order.guestInfo?.lastName]
            .filter(Boolean)
            .join(' ') || 'Guest'
        : 'Customer';
      await notifyCashiersOfOrderCancelled(
        String(order._id),
        customerName,
        reason
      );

      const updated = await orderRepository.findById(String(order._id));
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  /**
   * MANUAL PAYMENT — step 1 (customer).
   *
   * Available once the cashier has confirmed the order (that is when the
   * payment instructions become visible). The customer submits what they paid
   * (down payment for pre-order-only carts, full payment otherwise), which
   * channel they used, an optional note, and the screenshot as proof.
   *
   * Guests authenticate with the order's phone number (query or body), the
   * same way tracking does. A verified payment can never be overwritten; a
   * claim can be re-submitted freely until the cashier verifies it.
   */
  async submitPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      assertOrderCustomerAccess(order, req);

      if (order.orderSource === 'in-store') {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Counter orders are paid directly at the register'
        );
      }
      if (order.orderStatus !== 'confirmed') {
        throw new ApiError(
          409,
          'PAYMENT_NOT_OPEN',
          'Payment opens once the cashier confirms your order'
        );
      }
      if (order.paymentVerified === true) {
        throw new ApiError(
          409,
          'ALREADY_VERIFIED',
          'This order has already been verified by the cashier'
        );
      }

      const claimedStatus = req.body?.status as
        | 'down_payment'
        | 'paid'
        | undefined;
      if (claimedStatus !== 'down_payment' && claimedStatus !== 'paid') {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          "status must be 'down_payment' or 'paid'"
        );
      }

      const paymentMethod = req.body?.paymentMethod;
      if (!ONLINE_PAYMENT_METHODS.includes(paymentMethod as any)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          `paymentMethod must be one of: ${ONLINE_PAYMENT_METHODS.join(', ')}`
        );
      }

      const proof = (req as Request & {file?: Express.Multer.File}).file;
      if (!proof) {
        throw new ApiError(
          400,
          'NO_PROOF',
          'Please upload a screenshot of your payment'
        );
      }
      if (!proof.mimetype.startsWith('image/')) {
        throw new ApiError(400, 'INVALID_FILE', 'Proof of payment must be an image');
      }

      // Payment rules: a down payment is only for carts made up entirely of
      // pre-order products; anything with a regular product must be fully paid.
      if (claimedStatus === 'down_payment') {
        const hasRegular = await orderContainsRegularProduct(order);
        if (hasRegular) {
          throw new ApiError(
            400,
            'DOWN_PAYMENT_NOT_ALLOWED',
            'Orders that include regular products require full payment. Down payments only apply to pre-order products.'
          );
        }
      }

      const {secureUrl} = await uploadPaymentProofBuffer({
        buffer: proof.buffer,
        filename: proof.originalname
      });

      const claim = await orderRepository.submitManualPayment(
        String(order._id),
        {
          paymentStatus: claimedStatus,
          paymentProofUrl: secureUrl,
          paymentNote: isNonEmptyString(req.body?.note)
            ? req.body.note.trim()
            : null
        }
      );
      if (claim.modifiedCount === 0) {
        throw new ApiError(
          409,
          'ALREADY_VERIFIED',
          'This order has already been verified by the cashier'
        );
      }

      await transactionRepository.updateByOrderId(String(order._id), {
        paymentMethod: paymentMethod as PaymentMethod
      });

      const customerLabel = order.isGuest
        ? [order.guestInfo?.firstName, order.guestInfo?.lastName]
            .filter(Boolean)
            .join(' ') || 'A guest'
        : 'The customer';
      console.info(
        `[audit] payment submitted for order ${String(order._id)} (${claimedStatus} via ${paymentMethod}) by ${req.auth?.userId ?? order.guestInfo?.phoneNumber ?? 'guest'}`
      );
      await notifyCashiersOfPaymentSubmitted(
        String(order._id),
        customerLabel,
        PAYMENT_STATUS_LABELS[claimedStatus]
      );

      const updated = await orderRepository.findById(String(order._id));
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  /**
   * MANUAL PAYMENT — step 2 (cashier/admin).
   *
   * `verified: true`  -> confirms the customer's claim; the order can then move
   *                      towards preparing (the status gate hands the rest).
   * `verified: false` -> rejects the claim and resets it to unpaid, so the
   *                      customer can resubmit after talking to the cashier.
   */
  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }
      if (order.orderSource === 'in-store') {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Counter orders are paid directly at the register'
        );
      }

      if (order.orderStatus === 'cancelled') {
        throw new ApiError(
          409,
          'ORDER_CANCELLED',
          'This order was cancelled'
        );
      }
      const verified = req.body?.verified;
      if (typeof verified !== 'boolean') {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'verified must be true or false'
        );
      }

      const hasClaim =
        order.paymentStatus === 'down_payment' || order.paymentStatus === 'paid';
      if (!hasClaim) {
        throw new ApiError(
          409,
          'NO_PAYMENT_SUBMITTED',
          'The customer has not submitted a payment yet'
        );
      }

      if (verified) {
        if (order.paymentVerified === true) {
          throw new ApiError(
            409,
            'ALREADY_VERIFIED',
            'This order has already been verified'
          );
        }
        await orderRepository.updatePaymentState(String(order._id), {
          paymentVerified: true
        });
        const transaction = await transactionRepository.findByOrderId(
          String(order._id)
        );
        const methodLabel = transaction?.paymentMethod ?? 'n/a';
        console.info(
          `[audit] payment verified for order ${String(order._id)} (${order.paymentStatus} via ${methodLabel}) by ${req.auth.userId} (${req.auth.type})`
        );

        if (order.customerId) {
          await notificationService.createForCustomer({
            customerId: String(order.customerId),
            type: 'order_status',
            title: 'Payment verified',
            message: `We have verified your payment for order (#${String(order._id).slice(-6).toUpperCase()}). Your order is moving forward!`,
            orderId: String(order._id),
            link: '/customer/dashboard?tab=history'
          });
        }
      } else {
        await orderRepository.updatePaymentState(String(order._id), {
          paymentStatus: 'unpaid',
          paymentVerified: false,
          paymentProofUrl: null,
          paymentNote: null
        });
        await transactionRepository.updateByOrderId(String(order._id), {
          paymentMethod: 'other'
        });
        console.info(
          `[audit] payment rejected for order ${String(order._id)} by ${req.auth.userId} (${req.auth.type})`
        );

        if (order.customerId) {
          await notificationService.createForCustomer({
            customerId: String(order.customerId),
            type: 'order_status',
            title: 'Payment not verified',
            message: `We could not verify your payment for order (#${String(order._id).slice(-6).toUpperCase()}). Please re-submit it or contact us to sort out the details.`,
            orderId: String(order._id),
            link: '/customer/dashboard?tab=history'
          });
        }
      }

      const updated = await orderRepository.findById(req.params.id);
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  async listMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const orders = await orderRepository.listByCustomerId(req.auth.userId);
      const orderIds = orders.map(order => String(order._id));
      const items = await orderItemRepository.listByOrderIds(orderIds);
      const itemsByOrderId = items.reduce<Record<string, typeof items>>(
        (acc, item) => {
          const orderId = String(item.orderId);
          acc[orderId] = acc[orderId] ?? [];
          acc[orderId].push(item);
          return acc;
        },
        {}
      );

      const transactions = await transactionRepository.listByOrderIds(orderIds);
      const paymentMethodByOrderId = new Map(
        transactions.map(t => [String(t.orderId), t.paymentMethod])
      );

      const now = new Date();
      res.json({
        orders: orders.map(order => ({
          ...order.toObject(),
          paymentMethod: paymentMethodByOrderId.get(String(order._id)),
          items: itemsByOrderId[String(order._id)] ?? [],
          prepTiming: evaluateOrderTiming(order, now)
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async createCustomerOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      await assertStoreOpen();

      const {orderType, items, totalAmount, riderNotes, contactInfo, changeFor} =
        req.body;

      const validOrderTypes = ['pickup', 'delivery', 'reservation'] as const;
      if (!validOrderTypes.includes(orderType)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      const safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      const safeDeliveryFee =
        orderType === 'delivery' && items.length > 0 ? 49 : 0;

      // Validate and normalise every line once, before touching the database.
      const normalizedItems = items.map((i: any) => {
        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }
        const quantity = Number(i.quantity ?? i.qty ?? 1);
        if (!isPositiveInteger(quantity)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.quantity must be a whole number greater than zero'
          );
        }
        const price = Number(i.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
        }
        return {
          productId: i.productId as string,
          quantity,
          price,
          specialRequest: isNonEmptyString(i.specialRequest)
            ? i.specialRequest
            : isNonEmptyString(i.instructions)
              ? i.instructions
              : undefined
        };
      });

      const customerList = await customerRepository.listByIds([
        req.auth.userId as string
      ]);
      const customerProfile = customerList[0];

      const productIds = normalizedItems.map(i => i.productId);
      const {itemPreps, estimatedPrepMinutes, estimatedReadyAt} =
        await buildPrepSnapshot(productIds, orderType);

      const offeredName = isNonEmptyString(contactInfo?.firstName)
        ? contactInfo.firstName
        : undefined;
      const offeredLastName = isNonEmptyString(contactInfo?.lastName)
        ? contactInfo.lastName
        : undefined;
      const offeredPhone = isNonEmptyString(contactInfo?.phoneNumber)
        ? contactInfo.phoneNumber
        : undefined;
      const offeredAddress = isNonEmptyString(contactInfo?.address)
        ? contactInfo.address
        : undefined;

      // Reserve stock and create the order in ONE transaction. The reservation
      // validates the per-day pre-order allowance and the live batch stock, and
      // atomically drops the batches / product totals. Because two concurrent
      // checkouts write the same product document, one retries, so the
      // allowance and the stock can never be exceeded.
      let order: any;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const stamps = await reserveOrderStock({
            items: normalizedItems.map(i => ({
              productId: i.productId,
              quantity: i.quantity
            })),
            customerId: req.auth!.userId as string,
            session
          });

          order = await orderRepository.create(
            {
              customerId: req.auth!.userId as any,
              isGuest: false,
              guestInfo: {
                firstName: offeredName ?? customerProfile?.firstName ?? '',
                lastName: offeredLastName ?? customerProfile?.lastName ?? '',
                phoneNumber:
                  offeredPhone ?? customerProfile?.phoneNumber ?? '',
                address:
                  offeredAddress ?? customerProfile?.address ?? undefined
              },
              orderType,
              totalAmount: safeTotalAmount,
              deliveryFee: safeDeliveryFee,
              riderNotes: isNonEmptyString(riderNotes)
                ? riderNotes
                : undefined,
              changeFor: normalizeChangeFor(changeFor),
              statusHistory: [{status: 'pending', at: new Date()}],
              estimatedPrepMinutes,
              estimatedReadyAt,
              isOnline: true,
              // Stock is reserved at placement; the cashier confirm only
              // advances the status.
              stockDeducted: true
            },
            session
          );

          const orderItems = normalizedItems.map((item, index) => ({
            orderId: order._id,
            productId: item.productId as any,
            quantity: item.quantity,
            price: item.price,
            prepTimeMinutes: itemPreps[index] ?? null,
            // Which pre-order batch this was bought in (null for everything
            // else), so a cancel restores the stock to the right pool.
            preOrderBatchStart: stamps.get(item.productId) ?? null,
            specialRequest: item.specialRequest
          }));

          await orderItemRepository.createMany(orderItems, session);
        });
      } finally {
        await session.endSession();
      }

      // Manual payment flow: the payment channel is agreed with the cashier on
      // the confirmation call, not chosen at checkout. The transaction row
      // keeps its unique per-order shape with the placeholder'other' and is
      // updated once the customer submits payment and the cashier verifies it.
      const transaction = await transactionRepository.create({
        cashierId: null,
        orderId: order._id,
        paymentMethod: 'other',
        totalAmount: safeTotalAmount,
        isOnline: true
      });

      notifyCashiersOfNewOrder(String(order._id), safeTotalAmount);

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  },

  async sendGuestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await guestOtpService.sendOtp(req.body.phoneNumber);
      if (result.alreadyVerified) {
        return res.status(200).json({
          message: 'Phone number already verified',
          alreadyVerified: true
        });
      }
      res.status(200).json({message: 'Verification code sent'});
    } catch (error) {
      next(error);
    }
  },

  async verifyGuestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      await guestOtpService.verifyOtp(req.body.phoneNumber, req.body.code);
      res.status(200).json({message: 'Phone number verified'});
    } catch (error) {
      next(error);
    }
  },

  async checkGuestOtpStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const phoneNumber =
        typeof req.query.phoneNumber === 'string' ? req.query.phoneNumber : '';
      if (!isNonEmptyString(phoneNumber)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'phoneNumber is required');
      }
      const verified = await guestOtpService.isPhoneVerified(phoneNumber);
      res.status(200).json({
        verified,
        message: verified
          ? 'Phone number verified'
          : 'Phone number not verified'
      });
    } catch (error) {
      next(error);
    }
  },

  async createGuestOrder(req: Request, res: Response, next: NextFunction) {
    try {
      await assertStoreOpen();

      const {
        guestInfo,
        orderType,
        items,
        totalAmount,
        riderNotes,
        changeFor
      } = req.body;

      if (!guestInfo || typeof guestInfo !== 'object') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'guestInfo is required');
      }

      if (!isNonEmptyString(guestInfo.firstName)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'firstName is required');
      }
      if (!isNonEmptyString(guestInfo.lastName)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'lastName is required');
      }
      if (!isNonEmptyString(guestInfo.phoneNumber)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'phoneNumber is required');
      }

      const phoneVerified = await guestOtpService.isPhoneVerified(
        guestInfo.phoneNumber
      );
      if (!phoneVerified) {
        throw new ApiError(
          409,
          'PHONE_NOT_VERIFIED',
          'Verify your phone number before placing the order'
        );
      }

      const validOrderTypes = ['pickup', 'delivery', 'reservation'] as const;
      if (!validOrderTypes.includes(orderType)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      // Pre-order items are exclusive to signed-in customers. Guests are
      // already prevented from seeing them, so this catches a stale cart or a
      // direct API call trying to slip one through.
      await assertPreOrderItemsOrderable({
        items: items.map((i: any) => ({
          productId: i.productId,
          quantity: Math.max(1, Number(i.quantity ?? i.qty ?? 1))
        })),
        allowPreOrder: false
      });

      const safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      const safeDeliveryFee =
        orderType === 'delivery' && items.length > 0 ? 49 : 0;

      // Validate and normalise every line once, before touching the database.
      const normalizedItems = items.map((i: any) => {
        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }
        const quantity = Number(i.quantity ?? i.qty ?? 1);
        if (!isPositiveInteger(quantity)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.quantity must be a whole number greater than zero'
          );
        }
        const price = Number(i.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
        }
        return {
          productId: i.productId as string,
          quantity,
          price,
          specialRequest: isNonEmptyString(i.specialRequest)
            ? i.specialRequest
            : isNonEmptyString(i.instructions)
              ? i.instructions
              : undefined
        };
      });

      const productIds = normalizedItems.map(i => i.productId);
      const {itemPreps, estimatedPrepMinutes, estimatedReadyAt} =
        await buildPrepSnapshot(productIds, orderType);

      // Reserve stock at placement (like account orders) so two concurrent
      // guest checkouts cannot oversell. Guests never order pre-orders, so the
      // allowance path is not exercised here; reserveOrderStock still validates
      // live batch / product stock atomically.
      let order: any;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const stamps = await reserveOrderStock({
            items: normalizedItems.map(i => ({
              productId: i.productId,
              quantity: i.quantity
            })),
            session
          });

          order = await orderRepository.create(
            {
              customerId: null,
              isGuest: true,
              guestInfo: {
                firstName: guestInfo.firstName,
                lastName: guestInfo.lastName,
                phoneNumber: guestInfo.phoneNumber,
                address: isNonEmptyString(guestInfo.address)
                  ? guestInfo.address
                  : undefined
              },
              orderType,
              totalAmount: safeTotalAmount,
              deliveryFee: safeDeliveryFee,
              riderNotes: isNonEmptyString(riderNotes)
                ? riderNotes
                : undefined,
              changeFor: normalizeChangeFor(changeFor),
              statusHistory: [{status: 'pending', at: new Date()}],
              estimatedPrepMinutes,
              estimatedReadyAt,
              isOnline: true,
              // Stock is reserved at placement; the cashier confirm only
              // advances the status.
              stockDeducted: true
            },
            session
          );

          const orderItems = normalizedItems.map((item, index) => ({
            orderId: order._id,
            productId: item.productId as any,
            quantity: item.quantity,
            price: item.price,
            prepTimeMinutes: itemPreps[index] ?? null,
            preOrderBatchStart: stamps.get(item.productId) ?? null,
            specialRequest: item.specialRequest
          }));

          await orderItemRepository.createMany(orderItems, session);
        });
      } finally {
        await session.endSession();
      }

      // Manual payment flow: the payment channel is agreed with the cashier on
      // the confirmation call, not chosen at checkout. The transaction row
      // keeps its unique per-order shape with the placeholder'other' and is
      // updated once the customer submits payment and the cashier verifies it.
      const transaction = await transactionRepository.create({
        cashierId: null,
        orderId: order._id,
        paymentMethod: 'other',
        totalAmount: safeTotalAmount,
        isOnline: true
      });

      notifyCashiersOfNewOrder(String(order._id), safeTotalAmount);

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  },

  async checkOverdueOrders(_req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const preparing = await orderRepository.listPaginated(
        {orderStatus: 'preparing', orderSource: {$ne: 'in-store'}},
        1,
        0
      );
      for (const order of preparing) {
        const timing = evaluateOrderTiming(order as OrderDocument, now);
        if (timing.isOverdue) {
          notifyOverdueOrder(order as OrderDocument, timing).catch(error =>
            console.error('Failed to process overdue order', error)
          );
        }
      }
      res.status(200).json({checked: preparing.length});
    } catch (error) {
      next(error);
    }
  },

  async listCounterOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderRepository.listInStore();
      const orderIds = orders.map(order => String(order._id));
      const items = await orderItemRepository.listByOrderIds(orderIds);
      const itemsByOrderId = items.reduce<Record<string, typeof items>>(
        (acc, item) => {
          const orderId = String(item.orderId);
          acc[orderId] = acc[orderId] ?? [];
          acc[orderId].push(item);
          return acc;
        },
        {}
      );

      const transactions = await transactionRepository.listByOrderIds(orderIds);
      const paymentMethodByOrderId = new Map(
        transactions.map(t => [String(t.orderId), t.paymentMethod])
      );

      res.json({
        orders: orders.map(order => ({
          ...order.toObject(),
          paymentMethod: paymentMethodByOrderId.get(String(order._id)),
          items: itemsByOrderId[String(order._id)] ?? []
        }))
      });
    } catch (error) {
      next(error);
    }
  },

  async createCounterOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const {customerInfo, items, totalAmount, paymentMethod} = req.body;

      if (
        !customerInfo ||
        !isNonEmptyString(customerInfo.firstName) ||
        !isNonEmptyString(customerInfo.lastName)
      ) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'customerInfo.firstName and customerInfo.lastName are required'
        );
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      const safePhoneNumber = isNonEmptyString(customerInfo.phoneNumber)
        ? customerInfo.phoneNumber
        : 'n/a';

      const safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      // Normalise every line before creating anything so a rejected item can
      // never leave an orphan order behind.
      const normalizedItems = items.map((i: any) => {
        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }
        const quantity = Number(i.quantity ?? i.qty ?? 1);
        if (!isPositiveInteger(quantity)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.quantity must be a whole number greater than zero'
          );
        }
        const price = Number(i.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.price is invalid'
          );
        }
        return {
          productId: i.productId as string,
          quantity,
          price,
          specialRequest: isNonEmptyString(i.specialRequest)
            ? i.specialRequest
            : undefined
        };
      });

      // Pre-order items are not sold at the counter (no customer account to
      // scope the per-day allowance to).
      const counterProducts = await productRepository.findManyByIds(
        normalizedItems.map(i => i.productId)
      );
      const preOrderProduct = counterProducts.find(p => p.isPreOrder === true);
      if (preOrderProduct) {
        throw new ApiError(
          400,
          'PRE_ORDER_NOT_ALLOWED',
          `"${preOrderProduct.name}" is a pre-order item and cannot be sold at the counter.`
        );
      }

      const order = await orderRepository.create({
        customerId: null,
        isGuest: true,
        guestInfo: {
          firstName: customerInfo.firstName.trim(),
          lastName: customerInfo.lastName.trim(),
          phoneNumber: safePhoneNumber,
          email: isNonEmptyString(customerInfo.email)
            ? customerInfo.email.trim()
            : undefined
        },
        orderType: 'pickup',
        orderSource: 'in-store',
        totalAmount: safeTotalAmount,
        deliveryFee: 0,
        isOnline: true,
        orderStatus: 'completed',
        stockDeducted: false
      });

      const orderItems = normalizedItems.map(item => ({
        orderId: order._id,
        productId: item.productId as any,
        quantity: item.quantity,
        price: item.price,
        specialRequest: item.specialRequest
      }));

      await orderItemRepository.createMany(orderItems);
      await stockMovementService.deductOrderStock(String(order._id));
      await orderRepository.updateStockDeducted(String(order._id), true);

      const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
      const allowedPm = ['cash', 'card', 'gcash', 'other'] as const;
      const safePm: PaymentMethod = allowedPm.includes(pm as any)
        ? (pm as PaymentMethod)
        : 'cash';

      const transaction = await transactionRepository.create({
        cashierId: req.auth.userId as any,
        orderId: order._id,
        paymentMethod: safePm,
        totalAmount: safeTotalAmount,
        isOnline: true
      });

      if (order.guestInfo?.email) {
        try {
          await sendOrderReceiptEmail(String(order._id));
        } catch (error) {
          console.error('Failed to send counter order receipt email', error);
        }
      }

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  },

  async voidCounterOrder(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }
      if (order.orderSource !== 'in-store') {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Only in-store counter orders can be voided'
        );
      }
      if (order.orderStatus === 'cancelled') {
        throw new ApiError(400, 'INVALID_OPERATION', 'Order is already voided');
      }

      if (order.stockDeducted) {
        const claim = await orderRepository.claimStockRestore(String(order._id));
        if (claim.modifiedCount > 0) {
          try {
            await stockMovementService.restoreOrderStock(
              String(order._id),
              req.auth.userId
            );
          } catch (error) {
            await orderRepository.updateStockDeducted(String(order._id), true);
            throw error;
          }
        }
      }

      await orderRepository.updateStatusWithHistory(
        String(order._id),
        'cancelled',
        new Date()
      );

      const updated = await orderRepository.findById(req.params.id);
      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }

      const {status} = req.body;
      const validStatuses: OrderStatus[] = [
        'pending',
        'confirmed',
        'preparing',
        'ready',
        'on_the_way',
        'completed',
        'cancelled'
      ];

      if (!validStatuses.includes(status)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid order status');
      }

      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (status === 'ready' && order.orderType === 'delivery') {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Delivery orders use "on_the_way" instead of "ready"'
        );
      }

      if (status === 'on_the_way' && order.orderType !== 'delivery') {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'Only delivery orders can be marked as on the way'
        );
      }

      // MANUAL PAYMENT gate: an online order may only leave the queue for the
      // kitchen (preparing or beyond) once the cashier has verified the
      // customer's payment, and only fully-paid orders are allowed to start
      // when they contain regular products (down payments cover pre-order-only
      // carts, whose amount was negotiated on the confirmation call).
      // Pre-feature legacy rows have no payment fields at all (undefined) and
      // keep the previous behaviour.
      if (
        (status === 'preparing' ||
          status === 'ready' ||
          status === 'on_the_way' ||
          status === 'completed') &&
        order.orderSource !== 'in-store' &&
        order.orderStatus !== 'completed' &&
        order.paymentStatus !== undefined
      ) {
        if (order.paymentVerified !== true) {
          throw new ApiError(
            409,
            'PAYMENT_REQUIRED',
            'Verify the customer payment before continuing this order'
          );
        }
        if (
          order.paymentStatus !== 'paid' &&
          (await orderContainsRegularProduct(order))
        ) {
          throw new ApiError(
            409,
            'PAYMENT_REQUIRED',
            'Orders with regular products require full payment before preparation'
          );
        }
      }

      // Legacy pending orders (placed before reserve-at-placement) still
      // deduct on confirm. Claim the flag atomically first so a retried confirm
      // cannot deduct twice; new orders arrive already reserved
      // (stockDeducted true) and skip this entirely.
      if (status !== 'cancelled' && !order.stockDeducted) {
        const claim = await orderRepository.claimStockDeducted(
          String(order._id)
        );
        if (claim.modifiedCount > 0) {
          try {
            await stockMovementService.deductOrderStock(String(order._id));
          } catch (error) {
            await orderRepository.updateStockDeducted(
              String(order._id),
              false
            );
            throw error;
          }
        }
      }

      // Cancelling frees the stock AND the customer's per-day allowance (the
      // allowance counts every non-cancelled order). Any status may be
      // cancelled, including confirmed/completed. Claim first so a double
      // cancel cannot restore twice.
      if (status === 'cancelled' && order.stockDeducted) {
        const claim = await orderRepository.claimStockRestore(
          String(order._id)
        );
        if (claim.modifiedCount > 0) {
          try {
            await stockMovementService.restoreOrderStock(
              String(order._id),
              req.auth.userId
            );
          } catch (error) {
            await orderRepository.updateStockDeducted(
              String(order._id),
              true
            );
            throw error;
          }
        }
      }

      // Claw back loyalty points if we are cancelling an order that had
      // already credited them. Guarded by claimPointsReversal() so a
      // repeated cancel is a no-op instead of a double deduction.
      if (status === 'cancelled') {
        const awarded = order.pointsAwarded;
        if (
          order.customerId &&
          typeof awarded === 'number' &&
          awarded > 0 &&
          order.orderStatus === 'completed'
        ) {
          try {
            const claim = await orderRepository.claimPointsReversal(
              String(order._id)
            );
            if (claim.modifiedCount > 0) {
              const result = await customerRepository.subtractPoints(
                String(order.customerId),
                awarded
              );
              if (result.modifiedCount === 0) {
                // The customer already spent those points. We deliberately
                // never let a balance go negative, so this is logged for the
                // owner to settle by hand rather than silently ignored.
                console.error(
                  `Could not claw back ${awarded} points for order #${String(
                    order._id
                  ).slice(-6)
                  .toUpperCase()}: customer balance is lower than the awarded amount.`
                );
                try {
                  const admins = await adminRepository.listAll();
                  for (const admin of admins ?? []) {
                    await notificationService.createForAdmin({
                      adminId: String(admin._id),
                      type: 'points_adjustment',
                      title: 'Reward points could not be clawed back',
                      message: `Order #${String(order._id)
                        .slice(-6)
                        .toUpperCase()} was cancelled, but ${awarded.toLocaleString(
                        'en-PH',
                        {maximumFractionDigits: 0}
                      )} rewards points could not be removed from the customer's balance (already spent). Please settle manually.`,
                      orderId: String(order._id),
                      link: '/owner/dashboard?tab=orders'
                    });
                  }
                } catch (notifyError) {
                  console.error(
                    'Failed to notify admins about points clawback failure',
                    notifyError
                  );
                }
              } else {
                await notificationService.createForCustomer({
                  customerId: String(order.customerId),
                  type: 'order_status',
                  title: 'Rewards points adjusted',
                  message: `Order #${String(order._id)
                    .slice(-6)
                    .toUpperCase()} was cancelled, so ${awarded.toLocaleString(
                    'en-PH',
                    {maximumFractionDigits: 0}
                  )} rewards points were removed from your balance.`,
                  orderId: String(order._id),
                  link: '/customer/dashboard?tab=rewards'
                });
              }
            }
          } catch (error) {
            console.error('Failed to reverse rewards points', error);
          }
        }
      }

      const cancelReason =
        status === 'cancelled' &&
        typeof req.body?.reason === 'string' &&
        req.body.reason.trim().length > 0
          ? req.body.reason.trim()
          : undefined;

      await orderRepository.updateStatusWithHistory(
        req.params.id,
        status,
        new Date(),
        cancelReason
      );

      if (status === 'cancelled') {
        console.info(
          `[audit] order ${req.params.id} cancelled by ${req.auth?.userId ?? 'unknown'} (${req.auth?.type ?? 'unknown'}) reason="${cancelReason ?? ''}"`
        );
      }

      const updated = await orderRepository.findById(req.params.id);

      if (order.customerId) {
        await notificationService.createForCustomer({
          customerId: String(order.customerId),
          type: 'order_status',
          title: 'Order Status Update',
          message: `Your order (#${String(order._id).slice(-6).toUpperCase()}) is now ${STATUS_LABELS[status] ?? status}.`,
          orderId: String(order._id),
          link: '/customer/dashboard?tab=history'
        });

        if (status === 'completed') {
          try {
            // points_earned = Math.floor(earnable_amount), where
            // earnable_amount = totalAmount - deliveryFee.
            // The stored totalAmount INCLUDES the delivery fee, and delivery
            // fees never earn points. Pickup/reservation/counter orders carry
            // deliveryFee 0, so the whole total earns.
            // The earn rate lives in api/config/rewards.ts. Points are only
            // ever credited here, on a completed (paid) order — never on
            // cart/pending orders.
            const pointsEarned = pointsEarnedForOrder(
              order.totalAmount,
              order.deliveryFee
            );
            if (pointsEarned > 0) {
              // Claim first: only the caller that flips pointsAwarded from
              // null actually credits, so repeated `completed` updates are
              // a no-op instead of double-awarding.
              const claim = await orderRepository.claimPointsAwarded(
                String(order._id),
                pointsEarned
              );
              if (claim.modifiedCount > 0) {
                await customerRepository.addPoints(
                  String(order.customerId),
                  pointsEarned
                );
                await notificationService.createForCustomer({
                  customerId: String(order.customerId),
                  type: 'order_status',
                  title: 'Rewards points earned!',
                  message: `You earned ${pointsEarned.toLocaleString('en-PH', {maximumFractionDigits: 0})} rewards points for your order (#${String(order._id).slice(-6).toUpperCase()}). Redeem them in the Rewards tab!`,
                  orderId: String(order._id),
                  link: '/customer/dashboard?tab=rewards'
                });
              }
            }
          } catch (error) {
            console.error('Failed to award rewards points', error);
          }

          try {
            await notificationService.createReviewRequestForCustomer({
              customerId: String(order.customerId),
              orderId: String(order._id),
              title: 'We\u2019d love your feedback!',
              message: `Your order (#${String(order._id).slice(-6).toUpperCase()}) was completed. Please take a moment to share your experience.`
            });
          } catch (error) {
            console.error('Failed to create review request notification', error);
          }

          try {
            await sendOrderReceiptEmail(String(order._id));
          } catch (error) {
            console.error('Failed to send order receipt email', error);
          }
        }
      }

      res.status(200).json({order: updated});
    } catch (error) {
      next(error);
    }
  }
};
