import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {categoryRepository} from '../repositories/category.repository';
import type {CategoryDocument} from '../models/Category.model';
import type {StockUnit} from '../models/Category.model';
import {
  type ProductAllergen,
  type ProductIngredient
} from '../models/Product.model';
import {initialPointsCostForPrice} from '../config/rewards';
import {
  type PreOrderBatchInput,
  type PreOrderBatchStored,
  isPreOrderCategory,
  formatBatchTime,
  preOrderDeadlineToInstant,
  validatePreOrderFields
} from '../config/preOrder';
import {notificationService} from './notification.service';

/**
 * Tell signed-in customers a pre-order just opened.
 *
 * A broadcast failure must not undo a successful product save, so errors are
 * logged and swallowed — the product is what the owner asked for, and they
 * can re-save to announce again.
 */
async function announcePreOrder(product: {
  _id: unknown;
  name: string;
  preOrderDeadline?: Date | null;
  preOrderPurchaseLimit?: number | null;
  preOrderBatches?: Array<{startTime: string; stock: number}> | null;
}): Promise<void> {
  try {
    const notified = await notificationService.announcePreOrderToCustomers(
      product
    );
    console.log(
      `Pre-order "${product.name}" announced to ${notified} customer(s)`
    );
  } catch (error) {
    console.error(
      `Failed to announce pre-order "${product.name}" to customers`,
      error
    );
  }
}

/**
 * Normalise the incoming pre-order fields into exactly what should be stored.
 *
 * Turning pre-order OFF, or moving the product to a category that does not
 * support it, clears the limit, deadline and batches so stale values can
 * never be saved by accident and later resurface.
 *
 * When batches are present, `stock` is derived as
 * sum(batch.stock) - sum(batch.sold) so the product total can never drift
 * from the per-batch pools. Returned as a separate `stock` key the caller
 * only applies when it is defined.
 */
function resolvePreOrderFields(input: {
  category?: string | null;
  isPreOrder?: boolean | null;
  purchaseLimit?: number | null;
  deadlineInput?: string | null;
  /**
   * The deadline already stored on the product, used when the owner did not
   * touch it. Together with `deadlineCarriedOver` this lets an edit that leaves
   * an expired pre-order alone (e.g. changing the price) succeed instead of
   * being blocked by the past-date rule.
   */
  existingDeadline?: Date | null;
  deadlineCarriedOver?: boolean;
  /**
   * undefined = carry over the stored batches (owner did not touch them);
   * null = clear every batch; array = replace the schedule.
   */
  batchesInput?: PreOrderBatchInput[] | null | undefined;
  existingBatches?: PreOrderBatchStored[] | null;
}): {
  isPreOrder: boolean;
  preOrderPurchaseLimit: number | null;
  preOrderDeadline: Date | null;
  preOrderBatches: PreOrderBatchStored[] | null;
  stock?: number;
} {
  const enabled = input.isPreOrder === true;

  if (!enabled || !isPreOrderCategory(input.category)) {
    return {
      isPreOrder: false,
      preOrderPurchaseLimit: null,
      preOrderDeadline: null,
      preOrderBatches: null
    };
  }

  const pickedNewDate =
    input.deadlineInput != null && input.deadlineInput !== '';
  const deadline = pickedNewDate
    ? preOrderDeadlineToInstant(input.deadlineInput as string)
    : (input.existingDeadline ?? null);

  // undefined means the owner did not touch the schedule — keep what is
  // stored so an unrelated edit (price, description) never wipes it.
  const batches: PreOrderBatchInput[] | null =
    input.batchesInput === undefined
      ? (input.existingBatches ?? null)
      : (input.batchesInput ?? null);

  const check = validatePreOrderFields({
    category: input.category,
    isPreOrder: true,
    purchaseLimit: input.purchaseLimit ?? null,
    deadline,
    batches,
    allowPastDeadline: input.deadlineCarriedOver === true
  });
  if (!check.ok) {
    throw new ApiError(400, 'VALIDATION_ERROR', check.message);
  }

  // Legacy pre-order with no batches at all (saved before batches existed):
  // the owner-managed stock stands and the window stays all-day.
  if (!batches || batches.length === 0) {
    return {
      isPreOrder: true,
      preOrderPurchaseLimit: input.purchaseLimit as number,
      preOrderDeadline: deadline,
      preOrderBatches: null
    };
  }

  // Carry `sold` across an edit: batch i keeps what batch i already sold,
  // so lowering a batch below what customers already bought is rejected
  // instead of silently resurrecting stock.
  const existingSold = (index: number) =>
    input.existingBatches?.[index]?.sold ?? 0;
  const withSold: PreOrderBatchStored[] = batches.map((batch, index) => {
    const sold = existingSold(index);
    if (sold > batch.stock) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Batch ${formatBatchTime(batch.startTime)} cannot be set to ${batch.stock} — ${sold} have already been sold.`
      );
    }
    return {...batch, sold};
  });

  const stock = withSold.reduce((sum, b) => sum + b.stock - b.sold, 0);
  return {
    isPreOrder: true,
    preOrderPurchaseLimit: input.purchaseLimit as number,
    preOrderDeadline: deadline,
    preOrderBatches: withSold,
    stock
  };
}

async function resolveCategory(
  categoryName: string
): Promise<CategoryDocument> {
  const category = await categoryRepository.findByName(categoryName);
  if (!category) {
    throw new ApiError(
      422,
      'CATEGORY_NOT_FOUND',
      `Category "${categoryName}" is not in your category list. Add it in Settings > Menu Categories first.`
    );
  }
  return category;
}

export const productService = {
  /**
   * `includePreOrder` is false for guests: pre-order products are exclusive
   * to signed-in customers, so they are filtered out server-side rather than
   * merely hidden in the UI. Owners and cashiers still receive them so they
   * can manage and sell them at the counter.
   */
  async list(includePreOrder = true) {
    const products = await productRepository.listPublic();
    if (includePreOrder) return products;
    return products.filter(p => p.isPreOrder !== true);
  },

  async getById(id: string, includePreOrder = true) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    // A guest asking for a pre-order product directly gets a 404, so it is
    // indistinguishable from a product that does not exist.
    if (!includePreOrder && product.isPreOrder === true) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return product;
  },

  async create(
    adminId: string,
    data: {
      name: string;
      category: string;
      price: number;
      stock: number;
      stockUnit?: StockUnit;
      description?: string;
      imageUrl?: string;
      prepTimeMinutes?: number;
      ingredients?: ProductIngredient[];
      allergens?: ProductAllergen[];
      isAvailable?: boolean;
      pointsCost?: number | null;
      promoType?: 'percentage' | 'fixed_amount' | 'bundle';
      discountRate?: number;
      discountAmount?: number;
      promoStartDate?: string;
      promoEndDate?: string;
      isPromoActive?: boolean;
      isPreOrder?: boolean;
      preOrderPurchaseLimit?: number | null;
      preOrderDeadline?: string | null;
      preOrderBatches?: PreOrderBatchInput[] | null;
    }
  ) {
    const category = await resolveCategory(data.category);
    const preOrder = resolvePreOrderFields({
      category: data.category,
      isPreOrder: data.isPreOrder,
      purchaseLimit: data.preOrderPurchaseLimit,
      deadlineInput: data.preOrderDeadline,
      batchesInput: data.preOrderBatches
    });
    const created = await productRepository.create({
      ...data,
      // Batches own the stock; the client-sent total is only a fallback.
      stock: preOrder.stock ?? data.stock,
      stockUnit: category.stockUnit,
      isAvailable: data.isAvailable ?? true,
      // Seed new products that were not given an explicit owner-set cost.
      pointsCost: data.pointsCost ?? initialPointsCostForPrice(data.price),
      promoType: data.promoType,
      discountRate: data.discountRate,
      discountAmount: data.discountAmount,
      promoStartDate: data.promoStartDate
        ? new Date(data.promoStartDate)
        : undefined,
      promoEndDate: data.promoEndDate ? new Date(data.promoEndDate) : undefined,
      isPromoActive: data.isPromoActive,
      // Spread last so the normalised values win over the raw string input.
      ...preOrder,
      createdBy: adminId as any
    });

    // A brand new product can only be "turning pre-order on" once.
    if (created.isPreOrder === true) {
      await announcePreOrder(created);
    }

    return created;
  },

  async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      price?: number;
      stock?: number;
      stockUnit?: StockUnit;
      description?: string;
      imageUrl?: string;
      prepTimeMinutes?: number;
      ingredients?: ProductIngredient[];
      allergens?: ProductAllergen[];
      isAvailable?: boolean;
      pointsCost?: number | null;
      promoType?: 'percentage' | 'fixed_amount' | 'bundle';
      discountRate?: number;
      discountAmount?: number;
      promoStartDate?: string;
      promoEndDate?: string;
      isPromoActive?: boolean;
      isPreOrder?: boolean;
      preOrderPurchaseLimit?: number | null;
      preOrderDeadline?: string | null;
      preOrderBatches?: PreOrderBatchInput[] | null;
    }
  ) {
    // Pre-order state depends on the EFFECTIVE category and flag, so read the
    // current product first when the owner only changed one of them.
    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    if (data.category) {
      const category = await resolveCategory(data.category);
      data = {...data, stockUnit: category.stockUnit};
    }

    const effectiveCategory = data.category ?? existing.category;
    const effectiveIsPreOrder =
      data.isPreOrder === undefined ? existing.isPreOrder : data.isPreOrder;
    const effectiveLimit =
      data.preOrderPurchaseLimit === undefined
        ? existing.preOrderPurchaseLimit
        : data.preOrderPurchaseLimit;
    // When the owner does not touch the deadline, reuse the stored instant
    // directly instead of round-tripping through a date string.
    const deadlineCarriedOver = data.preOrderDeadline === undefined;

    const preOrder = resolvePreOrderFields({
      category: effectiveCategory,
      isPreOrder: effectiveIsPreOrder,
      purchaseLimit: effectiveLimit,
      deadlineInput: data.preOrderDeadline ?? null,
      existingDeadline: existing.preOrderDeadline ?? null,
      deadlineCarriedOver,
      batchesInput: data.preOrderBatches,
      existingBatches: existing.preOrderBatches ?? null
    });

    // pointsCost is intentionally NOT defaulted here: Mongoose
    // skips undefined, so omitting it leaves an existing owner-set cost intact,
    // and sending an explicit null clears it.
    const updateData: any = {...data};
    if (data.promoStartDate) {
      updateData.promoStartDate = new Date(data.promoStartDate);
    }
    if (data.promoEndDate) {
      updateData.promoEndDate = new Date(data.promoEndDate);
    }
    // Normalised pre-order values win over any raw input on the payload.
    updateData.isPreOrder = preOrder.isPreOrder;
    updateData.preOrderPurchaseLimit = preOrder.preOrderPurchaseLimit;
    updateData.preOrderDeadline = preOrder.preOrderDeadline;
    updateData.preOrderBatches = preOrder.preOrderBatches;
    // Keep the product total locked to the batch pools when batches exist.
    if (preOrder.stock !== undefined) {
      updateData.stock = preOrder.stock;
    }
    const updated = await productRepository.updateById(id, updateData);
    if (!updated) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Only announce on the OFF -> ON transition. Re-saving a product that was
    // already a pre-order (e.g. bumping the price) is not "turning it on", so
    // it stays quiet. Toggling off and back on announces again.
    const wasPreOrder = existing.isPreOrder === true;
    if (updated.isPreOrder === true && !wasPreOrder) {
      await announcePreOrder(updated);
    }

    return updated;
  },

  async remove(id: string) {
    const deleted = await productRepository.deleteById(id);
    if (!deleted) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    return {message: 'Deleted'};
  }
};
