import type {ClientSession} from 'mongoose';
import {ProductDocument, ProductModel} from '../models/Product.model';

/** Stock at or below this (but above 0) counts as "low" — matches the owner UI. */
export const LOW_STOCK_THRESHOLD = 10;

export type InventoryStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
export type InventorySort = 'attention' | 'name_asc' | 'stock_asc' | 'stock_desc' | 'updated';

export interface InventoryPageQuery {
  page: number;
  limit: number;
  search?: string;
  status?: InventoryStatusFilter;
  category?: string;
  sort?: InventorySort;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const productRepository = {
  findById: (id: string, session?: ClientSession) =>
    ProductModel.findById(id, null, {session}).exec(),

  findByIds: (ids: string[], session?: ClientSession) =>
    ProductModel.find({_id: {$in: ids}}, 'prepTimeMinutes', {session}).exec(),

  /** Full documents for many ids. Use `findByIds` when only prep times are needed. */
  findManyByIds: (ids: string[], session?: ClientSession) =>
    ProductModel.find({_id: {$in: ids}}, null, {session}).exec(),

  listPublic: () =>
    ProductModel.find({})
      .populate('createdBy', 'firstName lastName')
      .sort({createdAt: -1})
      .exec(),

  /**
   * One page of the owner's inventory table. Filtering, sorting and paging
   * all happen in Mongo so the client only ever receives `limit` rows.
   * Products sold only through dated pre-orders are left out, as in the UI.
   */
  async listInventoryPage(query: InventoryPageQuery) {
    // Bundles hold no stock of their own (orders use their items' stock).
    const match: Record<string, unknown> = {preOrderOnly: {$ne: true}, 'bundleItems.0': {$exists: false}};
    if (query.category && query.category !== 'all') {
      match.category = query.category;
    }
    const search = query.search?.trim();
    if (search) {
      match.name = {$regex: escapeRegex(search), $options: 'i'};
    }
    switch (query.status) {
      case 'out_of_stock':
        match.stock = {$lte: 0};
        break;
      case 'low_stock':
        match.stock = {$gt: 0, $lte: LOW_STOCK_THRESHOLD};
        break;
      case 'in_stock':
        match.stock = {$gt: LOW_STOCK_THRESHOLD};
        break;
      default:
        break;
    }

    let sort: Record<string, 1 | -1>;
    switch (query.sort) {
      case 'name_asc':
        sort = {name: 1, _id: 1};
        break;
      case 'stock_asc':
        sort = {stock: 1, name: 1, _id: 1};
        break;
      case 'stock_desc':
        sort = {stock: -1, name: 1, _id: 1};
        break;
      case 'updated':
        sort = {updatedAt: -1, _id: 1};
        break;
      case 'attention':
      default:
        sort = {_priority: 1, name: 1, _id: 1};
        break;
    }

    const skip = (query.page - 1) * query.limit;
    const [result] = await ProductModel.aggregate<{
      rows: Array<Record<string, unknown>>;
      total: Array<{count: number}>;
    }>([
      {$match: match},
      {
        $addFields: {
          _priority: {
            $switch: {
              branches: [
                {case: {$lte: ['$stock', 0]}, then: 0},
                {case: {$lte: ['$stock', LOW_STOCK_THRESHOLD]}, then: 1}
              ],
              default: 2
            }
          }
        }
      },
      {$sort: sort},
      {
        $facet: {
          rows: [{$skip: skip}, {$limit: query.limit}, {$project: {_priority: 0}}],
          total: [{$count: 'count'}]
        }
      }
    ])
      // Case-insensitive name order, like the old client-side localeCompare.
      .collation({locale: 'en', strength: 2})
      .exec();

    const total = result?.total[0]?.count ?? 0;
    return {
      products: result?.rows ?? [],
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit))
      }
    };
  },

  create: (data: Partial<ProductDocument>) => ProductModel.create(data),

  updateById: (id: string, data: Partial<ProductDocument>) =>
    ProductModel.findByIdAndUpdate(id, data, {new: true}).exec(),

  deleteById: (id: string) => ProductModel.findByIdAndDelete(id).exec(),

  countByCategory: (category: string) =>
    ProductModel.countDocuments({category}).exec(),

  /**
   * Reserve `qty` units from a specific batch, atomically.
   *
   * The filter only matches while the batch still has room
   * (`sold <= stock - qty`), and the same update drops the product total, so
   * two concurrent reservations can never push a batch below zero. Returns
   * null when the batch no longer has enough room. Run inside a session so a
   * failure later in the order rolls the reservation back.
   */
  reserveBatchStock: (
    productId: string,
    startTime: string,
    qty: number,
    maxSold: number,
    session?: ClientSession
  ) =>
    ProductModel.findOneAndUpdate(
      {
        _id: productId,
        preOrderBatches: {$elemMatch: {startTime, sold: {$lte: maxSold}}}
      },
      {$inc: {'preOrderBatches.$.sold': qty, stock: -qty}},
      {new: true, session}
    ).exec(),

  /** Atomically drop `qty` from the product total, only if enough remains. */
  decrementStock: (productId: string, qty: number, session?: ClientSession) =>
    ProductModel.findOneAndUpdate(
      {_id: productId, stock: {$gte: qty}},
      {$inc: {stock: -qty}},
      {new: true, session}
    ).exec()
};
