import {Request, Response, NextFunction} from 'express';
import {stockMovementService} from '../services/stockMovement.service';
import {ApiError} from '../utils/error';
import {
  productRepository,
  type InventorySort,
  type InventoryStatusFilter
} from '../repositories/product.repository';

const STATUS_VALUES: InventoryStatusFilter[] = ['all', 'in_stock', 'low_stock', 'out_of_stock'];
const SORT_VALUES: InventorySort[] = ['attention', 'name_asc', 'stock_asc', 'stock_desc', 'updated'];
const MAX_PAGE_SIZE = 50;

function readString(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

export const stockMovementController = {
  /** GET /inventory/products — paginated, filtered owner inventory table. */
  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Math.floor(Number(req.query.limit)) || 10)
      );
      const status = readString(req.query.status) as InventoryStatusFilter | undefined;
      const sort = readString(req.query.sort) as InventorySort | undefined;
      const result = await productRepository.listInventoryPage({
        page,
        limit,
        search: readString(req.query.search)?.slice(0, 100),
        category: readString(req.query.category)?.slice(0, 100),
        status: status && STATUS_VALUES.includes(status) ? status : 'all',
        sort: sort && SORT_VALUES.includes(sort) ? sort : 'attention'
      });
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async restock(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const product = await stockMovementService.restockProduct(
        req.params.productId,
        req.auth.userId,
        req.body
      );
      res.status(200).json({product});
    } catch (error) {
      next(error);
    }
  },

  async adjust(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.auth) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');
      }
      const product = await stockMovementService.adjustStock(
        req.params.productId,
        req.auth.userId,
        req.body
      );
      res.status(200).json({product});
    } catch (error) {
      next(error);
    }
  },

  async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.query.productId as string | undefined;
      const movements = await stockMovementService.listMovements(productId);
      res.status(200).json({movements});
    } catch (error) {
      next(error);
    }
  }
};
