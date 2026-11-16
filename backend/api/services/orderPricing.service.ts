import mongoose from 'mongoose';
import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {promoRepository} from '../repositories/promo.repository';
import type {PromoDocument} from '../models/Promo.model';

/**
 * Server-side prices for online orders (customer and guest checkout).
 *
 * The browser still sends a `price` on every line, but it is never trusted:
 * anyone can edit the request in DevTools. Each line is priced here from the
 * database instead, using the same rules the menu shows
 * (frontend/lib/utils/promoPricing.ts):
 *
 * - A product: its `price`, minus the first active percentage / fixed-amount
 *   promo that lists it (promos newest first, as GET /promos returns them),
 *   rounded to a whole peso and never above the base price.
 * - A bundle promo (its id is used as the line's productId): the promo's price.
 *
 * A line that is neither an orderable product nor an active bundle is rejected.
 */
export async function applyServerPrices<
  T extends {productId: string; price: number}
>(items: T[]): Promise<T[]> {
  const ids = Array.from(new Set(items.map(i => i.productId)));
  if (ids.some(id => !mongoose.isValidObjectId(id))) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'items.productId is invalid');
  }

  const [products, activePromos] = await Promise.all([
    productRepository.findManyByIds(ids),
    promoRepository.listPublic()
  ]);
  const productById = new Map(products.map(p => [String(p._id), p]));
  const bundleById = new Map(
    activePromos
      .filter(p => p.promoType === 'bundle' && typeof p.price === 'number' && p.price > 0)
      .map(p => [String(p._id), p])
  );

  for (const item of items) {
    const product = productById.get(item.productId);
    if (product) {
      item.price = discountedUnitPrice(product.price, item.productId, activePromos);
    } else {
      const bundle = bundleById.get(item.productId);
      if (!bundle) {
        throw new ApiError(
          400,
          'ITEM_UNAVAILABLE',
          'An item in your cart is no longer available. Please refresh your cart.'
        );
      }
      item.price = bundle.price as number;
    }

    if (!Number.isFinite(item.price) || item.price <= 0) {
      throw new ApiError(
        400,
        'ITEM_UNAVAILABLE',
        'An item in your cart is no longer available. Please refresh your cart.'
      );
    }
  }

  return items;
}

function discountedUnitPrice(
  basePrice: number,
  productId: string,
  activePromos: PromoDocument[]
): number {
  const promo = activePromos.find(
    p =>
      (p.promoType === 'percentage' || p.promoType === 'fixed_amount') &&
      Array.isArray(p.productIds) &&
      p.productIds.some(id => String(id) === productId)
  );
  if (!promo) return basePrice;

  let discounted = basePrice;
  if (promo.promoType === 'percentage' && typeof promo.discountRate === 'number') {
    discounted = basePrice * (1 - promo.discountRate / 100);
  }
  if (promo.promoType === 'fixed_amount' && typeof promo.discountAmount === 'number') {
    discounted = basePrice - promo.discountAmount;
  }

  const safe = Math.max(0, Math.round(discounted));
  return safe >= basePrice ? basePrice : safe;
}
