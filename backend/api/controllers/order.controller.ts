import {Request, Response, NextFunction} from 'express';
import mongoose from 'mongoose';
import {assertOrderTotalWithinLimits} from '../config/orderLimits';
import {ApiError} from '../utils/error';
import {phoneVariants} from '../utils/phone';
import {orderRepository} from '../repositories/order.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {transactionRepository} from '../repositories/transaction.repository';
import {productRepository} from '../repositories/product.repository';
import {stockMovementService} from '../services/stockMovement.service';
import {stockMovementRepository} from '../repositories/stockMovement.repository';
import {notificationService} from '../services/notification.service';
import {pushService} from '../services/push.service';
import {cashierRepository} from '../repositories/cashier.repository';
import {customerRepository} from '../repositories/customer.repository';
import {adminRepository} from '../repositories/admin.repository';
import {sendOrderReceiptEmail} from '../services/receipt.service';
import {emailService} from '../services/email.service';
import {orderTrackingEmailTemplate} from '../templates/orderTrackingEmail';
import {settingsRepository} from '../repositories/settings.repository';
import {env} from '../config/env';
import {storeStatusService} from '../services/storeStatus.service';
import {guestOtpService} from '../services/guestOtp.service';
import {guestOrderGuardService} from '../services/guestOrderGuard.service';
import {paymentService} from '../services/payment.service';
import {preOrderEventService} from '../services/preOrderEvent.service';
import {assertCashierMayHandle, notifyOwners} from '../services/ownerNotify.service';
import {assertOrderCustomerAccess} from '../utils/orderAccess';
import {
  buildPrepSnapshot,
  evaluateOrderTiming,
  type OrderPrepTiming
} from '../services/prepTime.service';
import type {
  OrderStatus,
  OrderDocument
} from '../models/Order.model';
import type {CashierDocument} from '../models/Cashier.model';
import {resolveRange} from '../utils/dateRange';
import {pointsEarnedForOrder} from '../config/rewards';
import {getDeliveryMode, isValidLatLng} from '../config/delivery';
import {customerStatusLabel, isStatusAllowed, parseCourier, staffFlowError} from '../config/orderFlow';
import {settingsService} from '../services/settings.service';
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
    // Push notification to subscribed cashiers and admins (fire-and-forget).
    try {
      await pushService.sendToRole('cashier', {
        title: 'New order',
        body: `A new order (#${String(orderId).slice(-6).toUpperCase()}) worth ₱${totalAmount}.00 has been placed.`,
        url: '/cashier/dashboard?tab=orders'
      });
    } catch (error) {
      console.error('Failed to push new order to cashiers', error);
    }
    try {
      await pushService.sendToRole('admin', {
        title: 'New order',
        body: `A new order (#${String(orderId).slice(-6).toUpperCase()}) worth ₱${totalAmount}.00 has been placed.`,
        url: '/owner/dashboard?tab=orders'
      });
    } catch (error) {
      console.error('Failed to push new order to admins', error);
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
      status.isManuallyClosed
         ? 'Store is temporarily closed'
        : 'Store is currently closed'
    );
  }
}

/**
 * The courier a customer will book for a self-booked delivery. Required for
 * those orders (so the store knows which rider to expect); null otherwise.
 */
function resolveCourier(orderType: string, deliveryMode: string, raw: unknown) {
  if (orderType !== 'delivery' || deliveryMode === 'DONCLAUDIO') return null;
  const courier = parseCourier(raw);
  if (!courier) {
    throw new ApiError(
      400,
      'COURIER_REQUIRED',
      'Choose which courier you will book (Lalamove, Grab Express, Move It, or type another one).'
    );
  }
  return courier;
}

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
      // Holiday pre-orders are handled by the owner only.
      if (req.auth?.type === 'cashier') filter.isPreOrder = {$ne: true};
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
      assertCashierMayHandle(req.auth, order);

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
        if (!order.isGuest || !order.guestInfo) {
          throw new ApiError(403, 'FORBIDDEN', 'Order not found');
        }
        // Tracking is by tracking number (order id) only.
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
        if (!order.isGuest || !order.guestInfo) {
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
      if (order.isPreOrder) {
        // Dated pre-orders: cancellable in any open status until the date's
        // cut-off (default 14 days before pickup).
        preOrderEventService.assertCustomerCanCancel(order);
      } else if (!CANCELLABLE.includes(order.orderStatus)) {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Order can no longer be cancelled'
        );
      }

      if (order.isPreOrder) {
        // Capacity lives on the pre-order date, not on product stock.
        await preOrderEventService.releaseForOrder(order);
      } else if (order.stockDeducted) {
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

      if (order.isPreOrder) {
        // Close open payment links and refund anything already paid online.
        try {
          await paymentService.handleOrderCancelled(
            String(order._id),
            reason ?? 'Cancelled by the customer'
          );
        } catch (error) {
          console.error('Failed to settle payments for cancelled pre-order', error);
        }
      }

      console.info(
        `[audit] order ${order._id} cancelled by customer ${req.auth?.userId ?? order.guestInfo?.phoneNumber ?? 'guest'} reason="${reason ?? ''}"`
      );

      const customerName = order.isGuest
        ? [order.guestInfo?.firstName, order.guestInfo?.lastName]
            .filter(Boolean)
            .join(' ') || 'Guest'
        : 'Customer';
      if (order.isPreOrder) {
        await notifyOwners({
          type: 'order_status',
          title: 'Pre-order cancelled',
          message: `${customerName} cancelled pre-order #${String(order._id).slice(-6).toUpperCase()}.${reason ? ` Reason: ${reason}.` : ''}`,
          orderId: String(order._id),
          link: '/owner/dashboard?tab=preorders'
        });
      } else {
        await notifyCashiersOfOrderCancelled(
          String(order._id),
          customerName,
          reason
        );
      }

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

      const {
        orderType,
        items,
        totalAmount,
        riderNotes,
        contactInfo,
        changeFor,
        deliveryLocation: rawDeliveryLocation,
        courier: rawCourier
      } = req.body;
      // The pinned drop-off decides free delivery (Tanza zone). Ignore a
      // malformed pin rather than failing the order: it just means Lalamove.
      const deliveryLocation =
        orderType === 'delivery' && isValidLatLng(rawDeliveryLocation)
          ? {lat: rawDeliveryLocation.lat, lng: rawDeliveryLocation.lng}
          : null;

      const validOrderTypes = ['pickup', 'delivery', 'reservation'] as const;
      if (!validOrderTypes.includes(orderType)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid orderType');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      let safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

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

      const deliveryProducts = await productRepository.findManyByIds(
        normalizedItems.map(i => i.productId)
      );
      const deliveryProductById = new Map(
        deliveryProducts.map(p => [String(p._id), p])
      );
      const freeDeliverySettings = await settingsService.getFreeDelivery();
      const deliveryMode = getDeliveryMode(
        normalizedItems.map(i => ({
          category: deliveryProductById.get(String(i.productId))?.category,
          price: i.price,
          quantity: i.quantity
        })),
        {
          buyer: 'customer',
          location: deliveryLocation,
          settings: freeDeliverySettings
        }
      );
      safeTotalAmount = normalizedItems.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0
      );
      assertOrderTotalWithinLimits(safeTotalAmount, 'customer');
      const courier = resolveCourier(orderType, deliveryMode, rawCourier);

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
      try {
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
                deliveryFee: 0,
                deliveryMode,
                deliveryLocation,
                courier,
                riderNotes: isNonEmptyString(riderNotes)
                  ? riderNotes
                  : undefined,
                changeFor: normalizeChangeFor(changeFor),
                statusHistory: [{status: 'pending', at: new Date()}],
                estimatedPrepMinutes,
                estimatedReadyAt,
                isOnline: true,
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
      } catch (e: any) {
        if (e?.code === 20 || e?.codeName === 'IllegalOperation') {
          const stamps = await reserveOrderStock({
            items: normalizedItems.map(i => ({
              productId: i.productId,
              quantity: i.quantity
            })),
            customerId: req.auth!.userId as string
          });

          order = await orderRepository.create({
            customerId: req.auth!.userId as any,
            isGuest: false,
            guestInfo: {
              firstName: offeredName ?? customerProfile?.firstName ?? '',
              lastName: offeredLastName ?? customerProfile?.lastName ?? '',
              phoneNumber: offeredPhone ?? customerProfile?.phoneNumber ?? '',
              address: offeredAddress ?? customerProfile?.address ?? undefined
            },
            orderType,
            totalAmount: safeTotalAmount,
            deliveryFee: 0,
            deliveryMode,
            deliveryLocation,
            courier,
            riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
            changeFor: normalizeChangeFor(changeFor),
            statusHistory: [{status: 'pending', at: new Date()}],
            estimatedPrepMinutes,
            estimatedReadyAt,
            isOnline: true,
            stockDeducted: true
          });

          const orderItems = normalizedItems.map((item, index) => ({
            orderId: order._id,
            productId: item.productId as any,
            quantity: item.quantity,
            price: item.price,
            prepTimeMinutes: itemPreps[index] ?? null,
            preOrderBatchStart: stamps.get(item.productId) ?? null,
            specialRequest: item.specialRequest
          }));

          await orderItemRepository.createMany(orderItems);
        } else {
          throw e;
        }
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

  async sendGuestEmailOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await guestOtpService.sendEmailOtp(req.body.email);
      if (result.alreadyVerified) {
        return res.status(200).json({
          message: 'Email already verified',
          alreadyVerified: true
        });
      }
      res.status(200).json({message: 'Verification code sent'});
    } catch (error) {
      next(error);
    }
  },

  async verifyGuestEmailOtp(req: Request, res: Response, next: NextFunction) {
    try {
      await guestOtpService.verifyEmailOtp(req.body.email, req.body.code);
      res.status(200).json({message: 'Email verified'});
    } catch (error) {
      next(error);
    }
  },

  async checkGuestEmailOtpStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const email =
        typeof req.query.email === 'string' ? req.query.email : '';
      if (!isNonEmptyString(email)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'email is required');
      }
      const verified = await guestOtpService.isEmailVerified(email);
      res.status(200).json({
        verified,
        message: verified ? 'Email verified' : 'Email not verified'
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
        changeFor,
        courier: rawCourier
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
      if (!isNonEmptyString(guestInfo.email)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'email is required');
      }

      // Spam protection layer 1: honeypot + form timer (no DB needed).
      const guardCtx = guestOrderGuardService.buildContext(
        req,
        guestInfo,
        Array.isArray(items)
          ? items.map((i: any) => ({
              productId: String(i?.productId ?? ''),
              quantity: Number(i?.quantity ?? i?.qty ?? 1)
            }))
          : []
      );
      await guestOrderGuardService.assertNotBot(guardCtx, req.body);

      let guestVerified = false;
      if (isNonEmptyString(guestInfo.phoneNumber)) {
        guestVerified = await guestOtpService.isPhoneVerified(
          guestInfo.phoneNumber
        );
      }
      if (!guestVerified && isNonEmptyString(guestInfo.email)) {
        guestVerified = await guestOtpService.isEmailVerified(guestInfo.email);
      }
      if (!guestVerified) {
        throw new ApiError(
          409,
          'PHONE_NOT_VERIFIED',
          'Verify your phone number or email before placing the order'
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

      let safeTotalAmount = Number(totalAmount);
      if (!Number.isFinite(safeTotalAmount) || safeTotalAmount <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

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

      const guestDeliveryProducts = await productRepository.findManyByIds(
        normalizedItems.map(i => i.productId)
      );
      const guestDeliveryProductById = new Map(
        guestDeliveryProducts.map(p => [String(p._id), p])
      );
      // Guests never get free delivery: it is for customers with an account.
      const deliveryMode = getDeliveryMode(
        normalizedItems.map(i => ({
          category: guestDeliveryProductById.get(String(i.productId))?.category,
          price: i.price,
          quantity: i.quantity
        })),
        {
          buyer: 'guest',
          settings: await settingsService.getFreeDelivery()
        }
      );
      safeTotalAmount = normalizedItems.reduce(
        (sum: number, i: any) => sum + i.price * i.quantity,
        0
      );
      assertOrderTotalWithinLimits(safeTotalAmount, 'guest');
      const courier = resolveCourier(orderType, deliveryMode, rawCourier);

      // Spam protection layer 2: per-IP / per-contact / duplicate limits.
      await guestOrderGuardService.assertWithinLimits(guardCtx);

      // Reserve stock at placement (like account orders) so two concurrent
      // guest checkouts cannot oversell. Guests never order pre-orders, so the
      // allowance path is not exercised here; reserveOrderStock still validates
      // live batch / product stock atomically.
      let order: any;
      try {
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
                deliveryFee: 0,
                deliveryMode,
                courier,
                riderNotes: isNonEmptyString(riderNotes)
                  ? riderNotes
                  : undefined,
                changeFor: normalizeChangeFor(changeFor),
                statusHistory: [{status: 'pending', at: new Date()}],
                estimatedPrepMinutes,
                estimatedReadyAt,
                isOnline: true,
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
      } catch (e: any) {
        if (e?.code === 20 || e?.codeName === 'IllegalOperation') {
          const stamps = await reserveOrderStock({
            items: normalizedItems.map(i => ({
              productId: i.productId,
              quantity: i.quantity
            }))
          });

          order = await orderRepository.create({
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
            deliveryFee: 0,
            deliveryMode,
            courier,
            riderNotes: isNonEmptyString(riderNotes) ? riderNotes : undefined,
            changeFor: normalizeChangeFor(changeFor),
            statusHistory: [{status: 'pending', at: new Date()}],
            estimatedPrepMinutes,
            estimatedReadyAt,
            isOnline: true,
            stockDeducted: true
          });

          const orderItems = normalizedItems.map((item, index) => ({
            orderId: order._id,
            productId: item.productId as any,
            quantity: item.quantity,
            price: item.price,
            prepTimeMinutes: itemPreps[index] ?? null,
            preOrderBatchStart: stamps.get(item.productId) ?? null,
            specialRequest: item.specialRequest
          }));

          await orderItemRepository.createMany(orderItems);
        } else {
          throw e;
        }
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

      await guestOrderGuardService.recordPlaced(guardCtx, order._id);

      notifyCashiersOfNewOrder(String(order._id), safeTotalAmount);

      if (isNonEmptyString(guestInfo.email)) {
        try {
          // Public site URL: email images and links must work outside localhost.
          const siteUrl = (env.FRONTEND_URL || 'https://don-claudios.vercel.app').replace(/\/+$/, '');
          const settings = await settingsRepository.findOne().catch(() => null);
          const contact = (settings as any)?.contact ?? {};
          const trackingNumber = String(order._id);
          const {html, text} = orderTrackingEmailTemplate({
            customerName: [guestInfo.firstName, guestInfo.lastName].filter(Boolean).join(' '),
            trackingNumber,
            orderCode: `#${trackingNumber.slice(-6).toUpperCase()}`,
            orderTypeLabel:
              orderType === 'delivery' ? 'Delivery' : orderType === 'reservation' ? 'Reservation' : 'Pick-up',
            placedAt: new Date().toLocaleString('en-PH', {
              timeZone: 'Asia/Manila',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }),
            items: normalizedItems.map(i => ({
              name: guestDeliveryProductById.get(String(i.productId))?.name ?? 'Item',
              quantity: i.quantity,
              lineTotal: i.price * i.quantity
            })),
            total: safeTotalAmount,
            trackUrl: `${siteUrl}/order-confirmation/${trackingNumber}`,
            imageUrl: `${siteUrl}/assets/Template/order_tracking_email.jpg`,
            businessName: "DonClaudio's Lechon House",
            businessPhone: Array.isArray(contact.phones) ? contact.phones[0] : undefined,
            businessAddress: contact.address || undefined
          });
          await emailService.sendEmail({
            to: guestInfo.email.trim(),
            subject: `Your order is in! Tracking #${trackingNumber.slice(-6).toUpperCase()} \u{1F437}`,
            text,
            html
          });
        } catch {
          // Do not fail order placement if email sending fails.
        }
      }

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
      const query = (req as Request & {validatedQuery?: ListAllOrdersQuery})
        .validatedQuery ?? {};
      const hasRange =
        query.preset !== undefined || query.from !== undefined || query.to !== undefined;
      const range = hasRange
        ? resolveRange({
            preset: query.preset ?? (query.from && query.to ? 'custom' : '7d'),
            from: query.from,
            to: query.to
          })
        : undefined;
      const filter: Record<string, unknown> = {};
      if (range) filter.createdAt = {$gte: range.from, $lt: range.to};
      if (query.status) filter.orderStatus = query.status;
      const orders = await orderRepository.listInStore(filter);
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

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

      const safeFirstName = isNonEmptyString(customerInfo?.firstName)
        ? customerInfo.firstName.trim()
        : 'Walk-in';
      const safeLastName = isNonEmptyString(customerInfo?.lastName)
        ? customerInfo.lastName.trim()
        : 'Customer';
      const safePhoneNumber = isNonEmptyString(customerInfo?.phoneNumber)
        ? customerInfo.phoneNumber
        : 'n/a';

      let safeTotalAmount = Number(totalAmount);
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
      const productById = new Map(
        counterProducts.map(p => [String(p._id), p])
      );
      const preOrderProduct = counterProducts.find(p => p.isPreOrder === true || p.preOrderOnly === true);
      if (preOrderProduct) {
        throw new ApiError(
          400,
          'PRE_ORDER_NOT_ALLOWED',
          `"${preOrderProduct.name}" is a pre-order item and cannot be sold at the counter.`
        );
      }
      for (const item of normalizedItems) {
        const product = productById.get(item.productId);
        if (!product) {
          throw new ApiError(
            404,
            'PRODUCT_NOT_FOUND',
            `Product ${item.productId} not found`
          );
        }
        if (product.stock < item.quantity) {
          throw new ApiError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for "${product.name}". Available: ${product.stock}, needed: ${item.quantity}`
          );
        }
      }

      // Recompute the total on the backend from product prices; never trust
      // the client-supplied total or price.
      const serverTotal = normalizedItems.reduce((sum, item) => {
        const product = productById.get(item.productId);
        return sum + (product?.price ?? item.price) * item.quantity;
      }, 0);

      // Generate a human-friendly DC-### order number on the backend.
      const existingInStore = await orderRepository.listInStore();
      let nextNumber = existingInStore.length + 1;
      const lastNumbered = existingInStore.find(o => o.orderNumber);
      if (lastNumbered?.orderNumber) {
        const match = lastNumbered.orderNumber.match(/DC-(\d+)/);
        if (match) {
          nextNumber = Math.max(nextNumber, parseInt(match[1], 10) + 1);
        }
      }
      const orderNumber = `DC-${String(nextNumber).padStart(3, '0')}`;

      const order = await orderRepository.create({
        customerId: null,
        isGuest: true,
        guestInfo: {
          firstName: safeFirstName,
          lastName: safeLastName,
          phoneNumber: safePhoneNumber,
          email: isNonEmptyString(customerInfo?.email)
            ? customerInfo.email.trim()
            : undefined
        },
        orderType: 'pickup',
        orderSource: 'in-store',
        totalAmount: serverTotal,
        deliveryFee: 0,
        isOnline: true,
        orderStatus: 'completed',
        stockDeducted: false,
        paymentStatus: 'unpaid',
        orderNumber
      });

      const orderItems = normalizedItems.map(item => ({
        orderId: order._id,
        productId: item.productId as any,
        quantity: item.quantity,
        price: productById.get(item.productId)?.price ?? item.price,
        specialRequest: item.specialRequest
      }));

      await orderItemRepository.createMany(orderItems);
      await stockMovementService.deductOrderStock(String(order._id));
      await orderRepository.updateStockDeducted(String(order._id), true);

      const transaction = await transactionRepository.create({
        cashierId: req.auth.userId as any,
        orderId: order._id,
        paymentMethod: 'other',
        totalAmount: serverTotal,
        isOnline: true
      });

      notifyCashiersOfNewOrder(String(order._id), serverTotal);

      res.status(201).json({order, transaction});
    } catch (error) {
      next(error);
    }
  },

  /**
   * Staff records CASH received for an online pickup order: either the whole
   * order (cash on pickup) or the balance after an online down payment.
   */
  async markOnlineOrderPaid(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      if (req.auth.type !== 'admin' && req.auth.type !== 'cashier') {
        throw new ApiError(403, 'FORBIDDEN', 'Admin or cashier access required');
      }

      const order = await orderRepository.findById(req.params.id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }
      assertCashierMayHandle(req.auth, order);
      if (order.orderSource === 'in-store') {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Counter orders use the counter payment flow'
        );
      }
      if (order.orderStatus === 'cancelled') {
        throw new ApiError(409, 'ORDER_CANCELLED', 'This order was cancelled');
      }
      if (order.paymentStatus === 'paid') {
        throw new ApiError(409, 'ALREADY_PAID', 'Order is already paid');
      }

      const cashPickup =
        order.paymentChoice === 'cash_on_pickup' &&
        (order.paymentStatus ?? 'unpaid') === 'unpaid';
      const cashBalance =
        order.paymentStatus === 'down_payment' &&
        order.balanceChoice === 'cash';
      if (!cashPickup && !cashBalance) {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Only cash payments can be marked as received here'
        );
      }

      const cashAmount = Math.max(
        0,
        order.totalAmount - (order.amountPaid ?? 0)
      );
      const result = await orderRepository.updatePaymentIfStatus(
        String(order._id),
        [cashPickup ? 'unpaid' : 'down_payment'],
        {
          paymentStatus: 'paid',
          paidAt: new Date(),
          paidBy: req.auth.userId,
          // A cash balance keeps the online channel as the order's method.
          ...(cashPickup ? {paymentMethod: 'cash'} : {})
        },
        {amountPaid: cashAmount}
      );
      if (result.modifiedCount === 0) {
        throw new ApiError(409, 'ALREADY_PAID', 'Order is already paid');
      }

      if (cashPickup) {
        await transactionRepository.updateByOrderId(String(order._id), {
          paymentMethod: 'cash',
          totalAmount: order.totalAmount
        });
      }
      console.info(
        `[audit] cash ${cashAmount} received for order ${String(order._id)} by ${req.auth.userId} (${req.auth.type})`
      );

      const updated = await orderRepository.findById(String(order._id));
      const transaction = await transactionRepository.findByOrderId(
        String(order._id)
      );

      res.status(200).json({order: updated, transaction});
    } catch (error) {
      next(error);
    }
  },

  async markCounterOrderPaid(req: Request, res: Response, next: NextFunction) {
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
          'Only in-store walk-in orders can be marked as paid'
        );
      }

      if (order.paymentStatus === 'paid') {
        throw new ApiError(
          409,
          'ALREADY_PAID',
          'Order is already paid'
        );
      }

      const pm = req.body?.paymentMethod;
      const allowedPm = ['cash', 'card', 'gcash', 'other'] as const;
      if (typeof pm !== 'string' || !allowedPm.includes(pm as any)) {
        throw new ApiError(
          400,
          'VALIDATION_ERROR',
          'paymentMethod is required and must be one of: cash, card, gcash, other'
        );
      }
      const safePm = pm as 'cash' | 'card' | 'gcash' | 'other';

      const paidAt = new Date();
      const result = await orderRepository.markPaidIfUnpaid(
        String(order._id),
        paidAt,
        req.auth.userId
      );

      if (result.modifiedCount === 0) {
        throw new ApiError(409, 'ALREADY_PAID', 'Order is already paid');
      }

      await orderRepository.updateFields(String(order._id), {
        paymentMethod: safePm
      });

      await transactionRepository.updateByOrderId(String(order._id), {
        paymentMethod: safePm as any,
        totalAmount: order.totalAmount
      });

      const updated = await orderRepository.findById(String(order._id));
      const transaction = await transactionRepository.findByOrderId(
        String(order._id)
      );

      res.status(200).json({order: updated, transaction});
    } catch (error) {
      next(error);
    }
  },

  async updateCounterOrder(req: Request, res: Response, next: NextFunction) {
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
          'Only in-store walk-in orders can be updated'
        );
      }
      if (order.paymentStatus === 'paid') {
        throw new ApiError(
          409,
          'ORDER_LOCKED',
          'Paid walk-in orders cannot be edited'
        );
      }
      if (order.orderStatus === 'cancelled') {
        throw new ApiError(
          400,
          'INVALID_OPERATION',
          'Cancelled orders cannot be edited'
        );
      }

      const {customerInfo, items, paymentMethod} = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'items are required');
      }

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
        return {productId: i.productId as string, quantity};
      });

      const products = await productRepository.findManyByIds(
        normalizedItems.map(i => i.productId)
      );
      const productById = new Map(products.map(p => [String(p._id), p]));
      const preOrderProduct = products.find(p => p.isPreOrder === true || p.preOrderOnly === true);
      if (preOrderProduct) {
        throw new ApiError(
          400,
          'PRE_ORDER_NOT_ALLOWED',
          `"${preOrderProduct.name}" is a pre-order item and cannot be sold at the counter.`
        );
      }
      for (const item of normalizedItems) {
        const product = productById.get(item.productId);
        if (!product) {
          throw new ApiError(
            404,
            'PRODUCT_NOT_FOUND',
            `Product ${item.productId} not found`
          );
        }
      }

      // Stock adjustment by difference. Old stock is already deducted, so the
      // remaining stock is what is available for any INCREASE in quantity.
      const oldItems = await orderItemRepository.listByOrderId(String(order._id));
      const oldQtyByProduct = new Map<string, number>();
      for (const item of oldItems) {
        const pid = String(item.productId);
        oldQtyByProduct.set(
          pid,
          (oldQtyByProduct.get(pid) ?? 0) + item.quantity
        );
      }
      const newQtyByProduct = new Map<string, number>();
      for (const item of normalizedItems) {
        newQtyByProduct.set(
          item.productId,
          (newQtyByProduct.get(item.productId) ?? 0) + item.quantity
        );
      }

      const allProductIds = new Set([
        ...oldQtyByProduct.keys(),
        ...newQtyByProduct.keys()
      ]);

      // Validate increases first.
      for (const productId of allProductIds) {
        const oldQty = oldQtyByProduct.get(productId) ?? 0;
        const newQty = newQtyByProduct.get(productId) ?? 0;
        const delta = newQty - oldQty;
        if (delta > 0) {
          const product = productById.get(productId);
          if (!product) {
            throw new ApiError(404, 'PRODUCT_NOT_FOUND', `Product ${productId} not found`);
          }
          if (product.stock < delta) {
            throw new ApiError(
              400,
              'INSUFFICIENT_STOCK',
              `Insufficient stock for "${product.name}". Available: ${product.stock}, needed: ${delta}`
            );
          }
        }
      }

      // Recompute total on the backend from (current) product prices.
      const serverTotal = normalizedItems.reduce((sum, item) => {
        const product = productById.get(item.productId);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0);
      if (!Number.isFinite(serverTotal) || serverTotal <= 0) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'totalAmount is invalid');
      }

      // Apply stock changes.
      for (const productId of allProductIds) {
        const oldQty = oldQtyByProduct.get(productId) ?? 0;
        const newQty = newQtyByProduct.get(productId) ?? 0;
        const delta = newQty - oldQty;
        if (delta === 0) continue;
        const product = await productRepository.findById(productId);
        if (!product) continue;
        const previousStock = product.stock;
        // delta > 0 means more consumed -> stock decreases.
        const newStock = previousStock - delta;
        if (newStock < 0) {
          throw new ApiError(
            400,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for "${product.name}"`
          );
        }
        product.stock = newStock;
        await product.save();
        try {
          await stockMovementRepository.create({
            productId: productId as any,
            type: 'adjustment',
            quantity: -delta,
            previousStock,
            newStock,
            note: 'Walk-in order edited',
            performedBy: req.auth.userId as any
          });
        } catch (error) {
          console.error('Failed to record stock movement for order edit', error);
        }
      }

      // Replace order items.
      await orderItemRepository.deleteByOrderId(String(order._id));
      const newOrderItems = normalizedItems.map(item => ({
        orderId: order._id,
        productId: item.productId as any,
        quantity: item.quantity,
        price: productById.get(item.productId)?.price ?? 0,
        specialRequest: undefined
      }));
      await orderItemRepository.createMany(newOrderItems);

      // Update order totals / guest info.
      const patch: Record<string, unknown> = {totalAmount: serverTotal};
      if (customerInfo && isNonEmptyString(customerInfo.firstName)) {
        patch['guestInfo.firstName'] = customerInfo.firstName.trim();
      }
      if (customerInfo && isNonEmptyString(customerInfo.lastName)) {
        patch['guestInfo.lastName'] = customerInfo.lastName.trim();
      }
      if (customerInfo && isNonEmptyString(customerInfo.phoneNumber)) {
        patch['guestInfo.phoneNumber'] = customerInfo.phoneNumber.trim();
      }
      if (customerInfo && isNonEmptyString(customerInfo.email)) {
        patch['guestInfo.email'] = customerInfo.email.trim();
      }
      await orderRepository.updateFields(String(order._id), patch);

      // Walk-in orders do not carry a payment method until they are marked as
      // paid, so only the total is updated here.
      await transactionRepository.updateByOrderId(String(order._id), {
        totalAmount: serverTotal
      });

      const updated = await orderRepository.findById(String(order._id));
      const transaction = await transactionRepository.findByOrderId(
        String(order._id)
      );

      res.status(200).json({order: updated, transaction});
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
      assertCashierMayHandle(req.auth, order);

      // Each kind of order has its own steps (see config/orderFlow.ts): only
      // the store's own rider goes "on the way"; pick-up, reservation and
      // customer-booked couriers use "ready" instead.
      if (!isStatusAllowed(order, status)) {
        throw new ApiError(400, 'VALIDATION_ERROR', staffFlowError(order, status));
      }

      // PAYMENT gate (Xendit): the kitchen may only start once the order is
      // paid online (fully, or the 50% down payment of a pre-order cart), or
      // the customer chose cash on pickup. Completing needs the full amount.
      paymentService.assertPaymentAllowsStatus(order, status);

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
      if (status === 'cancelled' && order.isPreOrder) {
        await preOrderEventService.releaseForOrder(order);
      } else if (status === 'cancelled' && order.stockDeducted) {
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

      if (status === 'cancelled' && order.orderSource !== 'in-store') {
        // Close open Xendit invoices and refund anything already paid online.
        try {
          await paymentService.handleOrderCancelled(
            req.params.id,
            cancelReason ?? 'Cancelled by the store'
          );
        } catch (error) {
          console.error('Failed to settle payments for cancelled order', error);
        }
      }

      if (status === 'cancelled') {
        console.info(
          `[audit] order ${req.params.id} cancelled by ${req.auth?.userId ?? 'unknown'} (${req.auth?.type ?? 'unknown'}) reason="${cancelReason ?? ''}"`
        );
      }

      if (
        status === 'completed' &&
        order.customerId &&
        order.orderSource !== 'in-store'
      ) {
        try {
          const customer = await customerRepository.findById(
            String(order.customerId)
          );
          if (customer && customer.phoneVerified !== true) {
            await customerRepository.update(String(order.customerId), {
              phoneVerified: true
            } as any);
          }
        } catch (error) {
          console.error('Failed to set phoneVerified on completed order', error);
        }
      }

      const updated = await orderRepository.findById(req.params.id);

      if (order.customerId) {
        await notificationService.createForCustomer({
          customerId: String(order.customerId),
          type: 'order_status',
          title: 'Order Status Update',
          message: `Your order (#${String(order._id).slice(-6).toUpperCase()}) is now ${customerStatusLabel(order, status)}.`,
          orderId: String(order._id),
          link: '/customer/dashboard?tab=history'
        });

        if (status === 'completed') {
          try {
            // points_earned = Math.floor(earnable_amount * points / pesos),
            // where earnable_amount = totalAmount - deliveryFee and
            // points/pesos is the owner's earn rule (Settings > Rewards).
            // The stored totalAmount INCLUDES the delivery fee, and delivery
            // fees never earn points. Pickup/reservation/counter orders carry
            // deliveryFee 0, so the whole total earns.
            // The rule is read at award time (defaults in api/config/rewards.ts);
            // past orders keep the points they were already awarded.
            // Points are only ever credited here, on a completed (paid)
            // order — never on cart/pending orders.
            const earnRule = await settingsService.getRewardsEarn();
            const pointsEarned = pointsEarnedForOrder(
              order.totalAmount,
              order.deliveryFee,
              earnRule
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
