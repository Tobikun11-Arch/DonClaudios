import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {stockMovementRepository} from '../repositories/stockMovement.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {adminRepository} from '../repositories/admin.repository';
import {notificationService} from './notification.service';
import {getPreOrderState, type PreOrderBatchStored} from '../config/preOrder';
import type {StockMovementType} from '../models/StockMovement.model';
import type {AdminDocument} from '../models/Admin.model';

const LOW_STOCK_THRESHOLD = 10;

/**
 * Pick the batch an order item's stock should come from, in order of
 * preference: the batch stamped on the item at checkout, the batch that is
 * live right now (counter sales), then any batch that still has stock.
 *
 * Returns null when no batch can cover the quantity — the caller logs and
 * continues, because `product.stock` is the hard gate and bookkeeping drift
 * must never block a legitimate order.
 */
function resolveBatchForItem(
  product: {
    preOrderDeadline?: Date | string | null;
    preOrderBatches?: PreOrderBatchStored[] | null;
  },
  stampedStart: string | null | undefined,
  now: Date
): PreOrderBatchStored | null {
  const batches = product.preOrderBatches ?? [];
  const remaining = (b: PreOrderBatchStored) => b.stock - b.sold;

  const stamped = stampedStart
    ? batches.find(b => b.startTime === stampedStart)
    : undefined;
  if (stamped && remaining(stamped) > 0) return stamped;

  const state = getPreOrderState(
    {
      isPreOrder: true,
      preOrderDeadline: product.preOrderDeadline ?? null,
      preOrderBatches: batches
    },
    now
  );
  if (state.liveBatch) {
    const live = batches[state.liveBatch.index];
    if (live && remaining(live) > 0) return live;
  }

  return batches.find(b => remaining(b) > 0) ?? null;
}

async function notifyAdminsLowStock(
  products: Array<{productId: string; name: string; stock: number}>
) {
  const lowProducts = products.filter(p => p.stock <= LOW_STOCK_THRESHOLD);
  if (lowProducts.length === 0) return;

  try {
    const admins = (await adminRepository.listAll()) as
      | (AdminDocument & {_id: unknown})[]
      | null;
    for (const admin of admins ?? []) {
      for (const product of lowProducts) {
        try {
          const isOut = product.stock <= 0;
          await notificationService.createForAdmin({
            adminId: String(admin._id),
            type: 'low_stock',
            title: isOut ? 'Product out of stock' : 'Low product stock alert',
            message: isOut
              ? `"${product.name}" is now out of stock.`
              : `"${product.name}" is low on stock (${product.stock} remaining).`,
            link: '/owner/dashboard?tab=inventory'
          });
        } catch (error) {
          console.error('Failed to create low stock notification for admin', error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to notify admins about low stock', error);
  }
}

export const stockMovementService = {
  async restockProduct(
    productId: string,
    adminId: string,
    data: {quantity: number; note?: string}
  ) {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    const previousStock = product.stock;
    const newStock = previousStock + data.quantity;

    product.stock = newStock;
    await product.save();

    await stockMovementRepository.create({
      productId: product._id,
      type: 'restock',
      quantity: data.quantity,
      previousStock,
      newStock,
      note: data.note,
      performedBy: adminId as any
    });

    return product;
  },

  async adjustStock(
    productId: string,
    adminId: string,
    data: {quantity: number; reason: 'spoilage' | 'adjustment'; note?: string}
  ) {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    const previousStock = product.stock;
    const newStock = previousStock + data.quantity;

    if (newStock < 0) {
      throw new ApiError(
        400,
        'INSUFFICIENT_STOCK',
        `Cannot adjust by ${data.quantity}. Current stock is ${previousStock}`
      );
    }

    product.stock = newStock;
    await product.save();

    await stockMovementRepository.create({
      productId: product._id,
      type: data.reason,
      quantity: data.quantity,
      previousStock,
      newStock,
      note: data.note,
      performedBy: adminId as any
    });

    if (newStock <= LOW_STOCK_THRESHOLD) {
      await notifyAdminsLowStock([
        {productId: String(product._id), name: product.name, stock: newStock}
      ]);
    }

    return product;
  },

  async listMovements(productId?: string) {
    if (productId) {
      return stockMovementRepository.findByProductId(productId);
    }
    return stockMovementRepository.listAll();
  },

  async deductOrderStock(orderId: string) {
    const items = await orderItemRepository.listByOrderId(orderId);
    const movements: Array<{
      productId: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }> = [];
    const affectedProducts: Array<{productId: string; name: string; stock: number}> = [];
    const now = new Date();

    for (const item of items) {
      const product = await productRepository.findById(
        String(item.productId)
      );
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

      // Pre-order batches: the quantity comes out of one batch's pool, and
      // the item remembers which one so a cancel restores the right pool.
      let itemDirty = false;
      if (product.isPreOrder === true && (product.preOrderBatches ?? []).length > 0) {
        const batch = resolveBatchForItem(product, item.preOrderBatchStart, now);
        if (batch) {
          if (batch.stock - batch.sold >= item.quantity) {
            batch.sold += item.quantity;
          } else {
            // Partial coverage would push the pool negative — take what the
            // pool can give and leave the rest to the product-level total.
            batch.sold = batch.stock;
          }
          if (item.preOrderBatchStart !== batch.startTime) {
            item.preOrderBatchStart = batch.startTime;
            itemDirty = true;
          }
        } else {
          console.warn(
            `No pre-order batch could cover deduct for order item ${String(item._id)}`
          );
        }
      }

      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      product.stock = newStock;
      await product.save();
      if (itemDirty) {
        await item.save();
      }

      movements.push({
        productId: String(product._id),
        quantity: -item.quantity,
        previousStock,
        newStock
      });

      affectedProducts.push({
        productId: String(product._id),
        name: product.name,
        stock: newStock
      });
    }

    await notifyAdminsLowStock(affectedProducts);

    return movements;
  },

  async restoreOrderStock(orderId: string, adminId: string) {
    const items = await orderItemRepository.listByOrderId(orderId);
    const movements: Array<{
      productId: string;
      quantity: number;
      previousStock: number;
      newStock: number;
    }> = [];
    const now = new Date();

    for (const item of items) {
      const product = await productRepository.findById(
        String(item.productId)
      );
      if (!product) continue;

      // Put the quantity back into the batch it was taken from, so the
      // pool reopens for the rest of the window.
      if (product.isPreOrder === true && (product.preOrderBatches ?? []).length > 0) {
        const batches = product.preOrderBatches ?? [];
        let batch = item.preOrderBatchStart
          ? batches.find(b => b.startTime === item.preOrderBatchStart)
          : undefined;
        if (!batch) {
          const state = getPreOrderState(
            {
              isPreOrder: true,
              preOrderDeadline: product.preOrderDeadline ?? null,
              preOrderBatches: batches
            },
            now
          );
          batch = state.liveBatch
            ? batches[state.liveBatch.index]
            : batches.find(b => b.sold > 0);
        }
        if (batch && batch.sold > 0) {
          batch.sold = Math.max(0, batch.sold - item.quantity);
        }
      }

      const previousStock = product.stock;
      const newStock = previousStock + item.quantity;

      product.stock = newStock;
      await product.save();

      movements.push({
        productId: String(product._id),
        quantity: item.quantity,
        previousStock,
        newStock
      });
    }

    await Promise.all(
      movements.map(m =>
        stockMovementRepository.create({
          productId: m.productId as any,
          type: 'adjustment',
          quantity: m.quantity,
          previousStock: m.previousStock,
          newStock: m.newStock,
          note: 'Order cancelled — stock restored',
          performedBy: adminId as any
        })
      )
    );

    return movements;
  }
};
