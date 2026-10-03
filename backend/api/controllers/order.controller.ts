import {Request, Response, NextFunction} from 'express';
import {ApiError} from '../utils/error';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {stockMovementService} from '../services/stockMovement.service';
import {notificationService} from '../services/notification.service';
import {cashierRepository} from '../repositories/cashier.repository';
import {customerRepository} from '../repositories/customer.repository';
import {sendOrderReceiptEmail} from '../services/receipt.service';
import {storeStatusService} from '../services/storeStatus.service';
import {guestOtpService} from '../services/guestOtp.service';
import {
  buildPrepSnapshot,
  evaluateOrderTiming,
  type OrderPrepTiming
} from '../services/prepTime.service';
import type {PaymentMethod} from '../models/Transaction.model';
import type {OrderStatus, OrderDocument} from '../models/Order.model';
import type {CashierDocument} from '../models/Cashier.model';
import {resolveRange} from '../utils/dateRange';
import {pointsEarnedForOrderTotal} from '../config/rewards';
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
        await stockMovementService.restoreOrderStock(
          String(order._id),
          (req.auth?.userId as string) ?? 'customer'
        );
        await orderRepository.updateStockDeducted(String(order._id), false);
      }

      const reason =
        typeof req.body?.reason === 'string' && req.body.reason.trim().length > 0
          ? req.body.reason.trim()
          : undefined;

      await orderRepository.cancel(String(order._id), reason);

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

      const {orderType, items, totalAmount, riderNotes, paymentMethod, contactInfo, changeFor} =
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

      const customerList = await customerRepository.listByIds([
        req.auth.userId as string
      ]);
      const customerProfile = customerList[0];

      const productIds = items
        .map((i: any) => i.productId)
        .filter(isNonEmptyString);
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

      const order = await orderRepository.create({
        customerId: req.auth.userId as any,
        isGuest: false,
        guestInfo: {
          firstName: offeredName ?? customerProfile?.firstName ?? '',
          lastName: offeredLastName ?? customerProfile?.lastName ?? '',
          phoneNumber: offeredPhone ?? customerProfile?.phoneNumber ?? '',
          address: offeredAddress ?? customerProfile?.address ?? undefined
        },
        orderType,
        totalAmount: safeTotalAmount,
        deliveryFee: safeDeliveryFee,
        riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
        changeFor: normalizeChangeFor(changeFor),
        statusHistory: [{status: 'pending', at: new Date()}],
        estimatedPrepMinutes,
        estimatedReadyAt,
        isOnline: true
      });

      const orderItems = items.map((i: any, index: number) => {
        const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
        const safePrice = Number(i.price);

        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }

        if (!Number.isFinite(safePrice) || safePrice <= 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
        }

        return {
          orderId: order._id,
          productId: i.productId,
          quantity: safeQty,
          price: safePrice,
          prepTimeMinutes: itemPreps[index] ?? null,
          specialRequest: isNonEmptyString(i.specialRequest)
            ? i.specialRequest
            : isNonEmptyString(i.instructions)
              ? i.instructions
              : undefined
        };
      });

      await orderItemRepository.createMany(orderItems);

      const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
      const allowedPm = ['cash', 'card', 'gcash', 'other'] as const;
      const safePm: PaymentMethod = allowedPm.includes(pm as any)
        ? (pm as PaymentMethod)
        : 'cash';

      const transaction = await transactionRepository.create({
        cashierId: null,
        orderId: order._id,
        paymentMethod: safePm,
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
        paymentMethod,
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

      const safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      const safeDeliveryFee =
        orderType === 'delivery' && items.length > 0 ? 49 : 0;

      const productIds = items
        .map((i: any) => i.productId)
        .filter(isNonEmptyString);
      const {itemPreps, estimatedPrepMinutes, estimatedReadyAt} =
        await buildPrepSnapshot(productIds, orderType);

      const order = await orderRepository.create({
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
        riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
        changeFor: normalizeChangeFor(changeFor),
        statusHistory: [{status: 'pending', at: new Date()}],
        estimatedPrepMinutes,
        estimatedReadyAt,
        isOnline: true
      });

      const orderItems = items.map((i: any, index: number) => {
        const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
        const safePrice = Number(i.price);

        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }

        if (!Number.isFinite(safePrice) || safePrice <= 0) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'items.price is invalid');
        }

        return {
          orderId: order._id,
          productId: i.productId,
          quantity: safeQty,
          price: safePrice,
          prepTimeMinutes: itemPreps[index] ?? null,
          specialRequest: isNonEmptyString(i.specialRequest)
            ? i.specialRequest
            : isNonEmptyString(i.instructions)
              ? i.instructions
              : undefined
        };
      });

      await orderItemRepository.createMany(orderItems);

      const pm = typeof paymentMethod === 'string' ? paymentMethod : 'cash';
      const allowedPm = ['cash', 'card', 'gcash', 'other'] as const;
      const safePm: PaymentMethod = allowedPm.includes(pm as any)
        ? (pm as PaymentMethod)
        : 'cash';

      const transaction = await transactionRepository.create({
        cashierId: null,
        orderId: order._id,
        paymentMethod: safePm,
        totalAmount: safeTotalAmount,
        isOnline: true
      });

      notifyCashiersOfNewOrder(String(order._id), safeTotalAmount);

      res.status(201).json({order, transaction});
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

      const orderItems = items.map((i: any) => {
        const safeQty = Math.max(1, Number(i.quantity ?? i.qty ?? 1));
        const safePrice = Number(i.price);

        if (!isNonEmptyString(i.productId)) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.productId is required'
          );
        }

        if (!Number.isFinite(safePrice) || safePrice <= 0) {
          throw new ApiError(
            400,
            'VALIDATION_ERROR',
            'items.price is invalid'
          );
        }

        return {
          orderId: order._id,
          productId: i.productId,
          quantity: safeQty,
          price: safePrice,
          specialRequest: isNonEmptyString(i.specialRequest)
            ? i.specialRequest
            : undefined
        };
      });

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
        await stockMovementService.restoreOrderStock(
          String(order._id),
          req.auth.userId
        );
        await orderRepository.updateStockDeducted(String(order._id), false);
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

      if (status !== 'cancelled' && !order.stockDeducted) {
        await stockMovementService.deductOrderStock(String(order._id));
        await orderRepository.updateStockDeducted(String(order._id), true);
      }

      if (
        status === 'cancelled' &&
        order.stockDeducted &&
        order.orderStatus !== 'pending'
      ) {
        await stockMovementService.restoreOrderStock(
          String(order._id),
          req.auth.userId
        );
        await orderRepository.updateStockDeducted(String(order._id), false);
      }

      await orderRepository.updateStatusWithHistory(
        req.params.id,
        status,
        new Date()
      );

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
            // points_earned = Math.floor(order_total) — the earn rate lives
            // in api/config/rewards.ts. Points are only ever credited here,
            // on a completed (paid) order — never on cart/pending orders.
            const pointsEarned = pointsEarnedForOrderTotal(order.totalAmount);
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
