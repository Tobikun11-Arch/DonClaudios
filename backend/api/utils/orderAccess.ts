import type {Request} from 'express';
import type {OrderDocument} from '../models/Order.model';
import {ApiError} from './error';

/**
 * Customer-side access rule shared by tracking, cancelling and paying: a
 * guest must know the order's phone number (query or body) when given, an
 * account customer must own the order. Staff tokens are rejected here.
 */
export function assertOrderCustomerAccess(
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
    if (phoneNumber) {
      if (
        order.isGuest !== true ||
        !order.guestInfo ||
        order.guestInfo.phoneNumber !== phoneNumber
      ) {
        throw new ApiError(403, 'FORBIDDEN', 'Order not found');
      }
    } else {
      if (!order.isGuest || !order.guestInfo) {
        throw new ApiError(403, 'FORBIDDEN', 'Order not found');
      }
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
