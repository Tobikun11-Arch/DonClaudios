import type {Promo} from '@/lib/types/promo';

export type PromoBadge =
  | {kind: 'bundle'; label: string}
  | {kind: 'discount'; label: string}
  | null;

export function getPromoBadgeForProduct(params: {
  promos: Promo[];
  productId: string;
}): PromoBadge {
  const {promos, productId} = params;

  const applicable = promos.filter(p =>
    (p.promoType === 'percentage' || p.promoType === 'fixed_amount') &&
    Array.isArray(p.productIds) &&
    p.productIds.includes(productId)
  );

  if (applicable.length === 0) return null;

  const p = applicable[0];

  if (p.promoType === 'percentage' && typeof p.discountRate === 'number') {
    return {kind: 'discount', label: `${p.discountRate}% OFF`};
  }

  if (p.promoType === 'fixed_amount' && typeof p.discountAmount === 'number') {
    return {kind: 'discount', label: `₱${p.discountAmount} OFF`};
  }

  return {kind: 'discount', label: 'PROMO'};
}

export function getDiscountedUnitPrice(params: {
  promos: Promo[];
  productId: string;
  basePrice: number;
}): {unitPrice: number; badge: PromoBadge} {
  const {promos, productId, basePrice} = params;

  const badge = getPromoBadgeForProduct({promos, productId});
  if (!badge) return {unitPrice: basePrice, badge: null};

  const applicable = promos.filter(p =>
    (p.promoType === 'percentage' || p.promoType === 'fixed_amount') &&
    Array.isArray(p.productIds) &&
    p.productIds.includes(productId)
  );

  if (applicable.length === 0) return {unitPrice: basePrice, badge: null};

  const p = applicable[0];

  let discounted = basePrice;

  if (p.promoType === 'percentage' && typeof p.discountRate === 'number') {
    discounted = basePrice * (1 - p.discountRate / 100);
  }

  if (p.promoType === 'fixed_amount' && typeof p.discountAmount === 'number') {
    discounted = basePrice - p.discountAmount;
  }

  const safe = Math.max(0, Math.round(discounted));

  if (safe >= basePrice) return {unitPrice: basePrice, badge};
  return {unitPrice: safe, badge};
}

export function getBundleBadge(): PromoBadge {
  return {kind: 'bundle', label: 'BUNDLE'};
}
