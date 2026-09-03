import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {stockMovementRepository} from '../repositories/stockMovement.repository';
import {orderItemRepository} from '../repositories/orderItem.repository';
import {adminRepository} from '../repositories/admin.repository';
import {notificationService} from './notification.service';
import type {StockMovementType} from '../models/StockMovement.model';
import type {AdminDocument} from '../models/Admin.model';

const LOW_STOCK_THRESHOLD = 10;

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

      const previousStock = product.stock;
      const newStock = previousStock - item.quantity;

      product.stock = newStock;
      await product.save();

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

    for (const item of items) {
      const product = await productRepository.findById(
        String(item.productId)
      );
      if (!product) continue;

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
