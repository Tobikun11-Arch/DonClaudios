import type {ClientSession} from 'mongoose';
import {OrderItemModel, OrderItemDocument} from '../models/OrderItem.model';

const POPULATE_FIELDS = 'name imageUrl category isPreOrder';

/**
 * A bundle line's productId is the bundle promo's id, and a deleted product
 * populates to null, so neither has a `productId.name`. Every screen reads
 * the name from there, so fill it from the line's own name snapshot.
 */
function withNameFallback<T extends {productId?: unknown; name?: string | null; promoId?: unknown}>(
  items: T[]
): T[] {
  for (const item of items as any[]) {
    const populated = item.productId && typeof item.productId === 'object' && 'name' in item.productId;
    if (populated) continue;
    const isBundle = Boolean(item.promoId);
    item.productId = {
      _id: item.promoId ?? item.productId ?? null,
      name: item.name || (isBundle ? 'Bundle' : 'Deleted product'),
      imageUrl: null,
      category: isBundle ? 'Bundle' : null,
      isPreOrder: false,
      isBundle
    };
  }
  return items;
}

export const orderItemRepository = {
  listByOrderId: (orderId: string, session?: ClientSession) =>
    OrderItemModel.find({orderId}, null, {session}).exec(),

  /** Plain objects (read-only use) with `productId` populated. */
  listByOrderIds: async (orderIds: string[], session?: ClientSession) =>
    withNameFallback(
      await OrderItemModel.find({orderId: {$in: orderIds}}, null, {session})
        .populate('productId', POPULATE_FIELDS)
        .lean()
        .exec()
    ),

  /**
   * Same result as listByOrderIds but as plain objects (no Mongoose document
   * hydration). Used by the order list endpoints that are polled, where the
   * items are only serialised to JSON.
   */
  listByOrderIdsLean: async (orderIds: string[]) =>
    withNameFallback(
      await OrderItemModel.find({orderId: {$in: orderIds}})
        .populate('productId', POPULATE_FIELDS)
        .lean()
        .exec()
    ),

  /**
   * Lean items (only the fields the allowance math needs) for use inside the
   * reservation transaction, where a populate would just add round-trips.
   */
  listLeanByOrderIds: (orderIds: string[], session?: ClientSession) =>
    OrderItemModel.find(
      {orderId: {$in: orderIds}},
      'orderId productId quantity',
      {session}
    )
      .lean()
      .exec(),

  createMany: (
    items: Array<Partial<OrderItemDocument>>,
    session?: ClientSession
  ) => OrderItemModel.insertMany(items, {session}),

  deleteByOrderId: (orderId: string, session?: ClientSession) =>
    OrderItemModel.deleteMany({orderId}, {session}).exec()
};
