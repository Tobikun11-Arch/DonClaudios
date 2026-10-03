import {randomUUID} from 'crypto';
import {ApiError} from '../utils/error';
import {customerRepository} from '../repositories/customer.repository';
import {productRepository} from '../repositories/product.repository';
import {rewardRedemptionRepository} from '../repositories/reward.repository';
import {fallbackPointsCost} from '../config/rewards';

/**
 * A reward's point cost is STORED on the product as `pointsCost` and owned
 * by the shop owner. `fallbackPointsCost` is only a safety net for products
 * that somehow have no stored value yet (see scripts/backfillRewardPointsCost.ts).
 */
function resolvePointsCost(product: {
  pointsCost?: number | null;
  price: number;
}): number {
  if (typeof product.pointsCost === 'number' && Number.isFinite(product.pointsCost) && product.pointsCost > 0) {
    return Math.round(product.pointsCost);
  }
  return fallbackPointsCost(product.price);
}

function formatPoints(value: number): string {
  return value.toLocaleString('en-PH', {maximumFractionDigits: 0});
}

export const rewardService = {
  async getRewardsForCustomer(customerId: string) {
    const customer = await customerRepository.findById(customerId);
    if (!customer) {
      throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    const products = await productRepository.listPublic();
    const redeemableProducts = products
      .filter(p => p.isAvailable && p.stock > 0)
      .map(product => ({
        _id: String(product._id),
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl,
        description: product.description,
        pointsRequired: resolvePointsCost(product)
      }));

    const redemptions =
      await rewardRedemptionRepository.listByCustomerId(customerId);

    return {
      points: customer.points,
      products: redeemableProducts,
      redemptions: redemptions.map(r => ({
        _id: String(r._id),
        productId: String(r.productId),
        productName: r.productName,
        productImage: r.productImage,
        pointsSpent: r.pointsSpent,
        quantity: r.quantity,
        redeemCode: r.redeemCode,
        status: r.status,
        createdAt: r.createdAt
      }))
    };
  },

  async redeem(customerId: string, productId: string, quantity = 1) {
    const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));

    if (typeof productId !== 'string' || !productId.trim()) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'A reward is required');
    }

    const [customer, product] = await Promise.all([
      customerRepository.findById(customerId),
      productRepository.findById(productId)
    ]);

    if (!customer) {
      throw new ApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Reward not found');
    }
    if (!product.isAvailable || product.stock <= 0) {
      throw new ApiError(400, 'OUT_OF_STOCK', 'This reward is out of stock');
    }
    if (product.stock < safeQty) {
      throw new ApiError(
        400,
        'INSUFFICIENT_STOCK',
        `Only ${product.stock} left for "${product.name}"`
      );
    }

    const unitPoints = resolvePointsCost(product);
    const pointsRequired = unitPoints * safeQty;
    if (customer.points < pointsRequired) {
      throw new ApiError(
        400,
        'INSUFFICIENT_POINTS',
        `You need ${formatPoints(pointsRequired)} points, but you only have ${formatPoints(customer.points)}.`
      );
    }

    const pointsResult = await customerRepository.subtractPoints(
      customerId,
      pointsRequired
    );
    if (pointsResult.modifiedCount === 0) {
      throw new ApiError(
        400,
        'INSUFFICIENT_POINTS',
        'Your points balance changed. Please try again.'
      );
    }

    product.stock -= safeQty;
    await product.save();

    const redemption = await rewardRedemptionRepository.create({
      customerId: customer._id as any,
      productId: product._id as any,
      productName: product.name,
      productImage: product.imageUrl,
      pointsSpent: pointsRequired,
      quantity: safeQty,
      redeemCode: randomUUID(),
      status: 'pending'
    });

    // Re-read the balance after the atomic $inc rather than deriving it from
    // the stale in-memory document.
    const refreshed = await customerRepository.findById(customerId);

    return {
      redemption: {
        _id: String(redemption._id),
        productId: String(product._id),
        productName: product.name,
        productImage: product.imageUrl,
        pointsSpent: pointsRequired,
        quantity: safeQty,
        redeemCode: redemption.redeemCode,
        status: redemption.status,
        createdAt: redemption.createdAt
      },
      remainingPoints: refreshed?.points ?? customer.points - pointsRequired
    };
  }
};