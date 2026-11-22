import {ApiError} from '../utils/error';
import {productRepository} from '../repositories/product.repository';
import {isEmbeddedPromoLive, isPromoCategory} from '../config/promoDates';

/**
 * Bundle Deals.
 *
 * A bundle is a product in the owner's "Promo" category with promoType
 * "bundle" and a list of `bundleItems` (product + quantity). It holds no stock
 * of its own. It is sold as ONE order line (its own product id) that carries a
 * snapshot of what one bundle contained (`bundleItems` on the order item), and
 * every stock movement (reserve, deduct, restore, counter edits) goes through
 * `toStockLines`, which turns each line into the real products it uses.
 */

export type BundleComponent = {productId: string; name: string; qty: number};

export type ResolvedBundle = {
  productId: string;
  title: string;
  price: number;
  components: BundleComponent[];
};

type BundleLike = {
  category?: string | null;
  promoType?: string | null;
  bundleItems?: Array<{productId: unknown; qty: number}> | null;
};

/** A Promo-category product set up as a Bundle Deal with items inside. */
export function isBundleProduct(product: BundleLike | null | undefined): boolean {
  return (
    !!product &&
    isPromoCategory(product.category) &&
    product.promoType === 'bundle' &&
    Array.isArray(product.bundleItems) &&
    product.bundleItems.length > 0
  );
}

/**
 * Checks a Bundle Deal before it is saved and returns the contents to store.
 * One bundle must hold at least 2 items in total, never a pre-order product
 * or another bundle, and cost less than buying the items one by one.
 */
export async function prepareBundleItems(
  price: number,
  items: Array<{productId: string; qty: number}>,
  selfId?: string
): Promise<Array<{productId: string; qty: number}>> {
  const qtyById = new Map<string, number>();
  for (const item of items) {
    const qty = Math.trunc(Number(item.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new ApiError(400, 'INVALID_BUNDLE', 'Each bundle item needs a quantity of at least 1');
    }
    if (selfId && item.productId === selfId) {
      throw new ApiError(400, 'INVALID_BUNDLE', 'A bundle cannot include itself');
    }
    qtyById.set(item.productId, (qtyById.get(item.productId) ?? 0) + qty);
  }
  const lines = Array.from(qtyById, ([productId, qty]) => ({productId, qty}));
  if (lines.reduce((n, l) => n + l.qty, 0) < 2) {
    throw new ApiError(400, 'INVALID_BUNDLE', 'A bundle needs at least 2 items');
  }

  let products;
  try {
    products = await productRepository.findManyByIds(lines.map(l => l.productId));
  } catch {
    throw new ApiError(400, 'INVALID_BUNDLE', 'A bundle item is invalid');
  }
  const byId = new Map(products.map(p => [String(p._id), p]));
  let originalTotal = 0;
  for (const line of lines) {
    const product = byId.get(line.productId);
    if (!product) {
      throw new ApiError(400, 'INVALID_BUNDLE', 'A bundle item no longer exists');
    }
    if (product.isPreOrder === true || product.preOrderOnly === true) {
      throw new ApiError(400, 'INVALID_BUNDLE', `"${product.name}" is a pre-order item and cannot be part of a bundle`);
    }
    if (isPromoCategory(product.category)) {
      throw new ApiError(400, 'INVALID_BUNDLE', `"${product.name}" is a promo and cannot be part of a bundle`);
    }
    originalTotal += product.price * line.qty;
  }
  if (!(price < originalTotal)) {
    throw new ApiError(
      400,
      'INVALID_BUNDLE',
      `The bundle price must be lower than the items' total of ₱${originalTotal.toLocaleString('en-PH')}`
    );
  }
  return lines;
}

/**
 * The live Bundle Deals among `ids`, with their contents checked: every item
 * must still exist, be on the menu, and not be a pre-order. Ids that are not
 * bundles are simply absent from the result.
 */
export async function loadActiveBundles(ids: string[], now = new Date()): Promise<Map<string, ResolvedBundle>> {
  const out = new Map<string, ResolvedBundle>();
  if (ids.length === 0) return out;

  const candidates = (await productRepository.findManyByIds(Array.from(new Set(ids)))).filter(isBundleProduct);
  if (candidates.length === 0) return out;

  const componentIds = Array.from(
    new Set(candidates.flatMap(p => (p.bundleItems ?? []).map(i => String(i.productId))))
  );
  const components = await productRepository.findManyByIds(componentIds);
  const componentById = new Map(components.map(p => [String(p._id), p]));

  for (const bundle of candidates) {
    if (!isEmbeddedPromoLive(bundle, now) || bundle.isAvailable === false) {
      throw new ApiError(400, 'PROMO_ENDED', `The "${bundle.name}" promo is not available right now.`);
    }
    const resolved: BundleComponent[] = [];
    for (const item of bundle.bundleItems ?? []) {
      const product = componentById.get(String(item.productId));
      if (!product || product.isAvailable === false || product.isPreOrder === true || product.preOrderOnly === true) {
        throw new ApiError(
          400,
          'ITEM_UNAVAILABLE',
          `"${bundle.name}" is not available right now because one of its items is off the menu. Please remove it from your cart.`
        );
      }
      resolved.push({productId: String(product._id), name: product.name, qty: item.qty});
    }
    out.set(String(bundle._id), {
      productId: String(bundle._id),
      title: bundle.name,
      price: bundle.price,
      components: resolved
    });
  }
  return out;
}

type LineLike = {
  productId: unknown;
  quantity: number;
  bundleItems?: Array<{productId: unknown; qty: number}> | null;
};

/**
 * The products and quantities an order really uses: a bundle line becomes its
 * components times the line quantity, and the same product from several
 * lines (a bundle plus a single order of it) is added together.
 */
export function toStockLines(items: LineLike[]): Array<{productId: string; quantity: number}> {
  const byProduct = new Map<string, number>();
  const add = (productId: string, qty: number) =>
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + qty);

  for (const item of items) {
    if (Array.isArray(item.bundleItems) && item.bundleItems.length > 0) {
      for (const c of item.bundleItems) add(String(c.productId), c.qty * item.quantity);
    } else {
      add(String(item.productId), item.quantity);
    }
  }
  return Array.from(byProduct, ([productId, quantity]) => ({productId, quantity}));
}

export type SnapshotFields = {
  name: string | null;
  promoId: string | null;
  bundleItems: BundleComponent[] | null;
};

/**
 * Stamps every order line with its name, and bundle lines with the bundle's
 * contents. Rejects a Promo-category product that is switched off or outside
 * its dates. Call after `applyServerPrices`.
 *
 * `previous` (counter edits only): bundle lines already on the order keep
 * their original contents even if the bundle has since ended or changed.
 */
export async function snapshotOrderLines<T extends {productId: string}>(
  items: T[],
  previous: Array<{productId: unknown; name?: string | null; bundleItems?: any}> = []
): Promise<Array<T & SnapshotFields>> {
  const ids = Array.from(new Set(items.map(i => i.productId)));
  const products = await productRepository.findManyByIds(ids);
  const productById = new Map(products.map(p => [String(p._id), p]));

  const kept = new Map<string, {name: string; bundleItems: BundleComponent[]}>();
  for (const p of previous) {
    if (Array.isArray(p.bundleItems) && p.bundleItems.length > 0) {
      kept.set(String(p.productId), {
        name: p.name ?? 'Bundle',
        bundleItems: p.bundleItems.map((c: any) => ({productId: String(c.productId), name: c.name, qty: c.qty}))
      });
    }
  }

  const bundles = await loadActiveBundles(ids.filter(id => !kept.has(id)));
  const now = new Date();

  return items.map(item => {
    const keptBundle = kept.get(item.productId);
    if (keptBundle) {
      return {...item, name: keptBundle.name, promoId: null, bundleItems: keptBundle.bundleItems};
    }
    const product = productById.get(item.productId);
    if (!product) {
      throw new ApiError(
        400,
        'ITEM_UNAVAILABLE',
        'An item in your cart is no longer available. Please refresh your cart.'
      );
    }
    const bundle = bundles.get(item.productId);
    if (bundle) {
      return {...item, name: bundle.title, promoId: null, bundleItems: bundle.components};
    }
    if (isBundleProduct(product) || !isEmbeddedPromoLive(product, now)) {
      throw new ApiError(400, 'PROMO_ENDED', `The "${product.name}" promo is not available right now.`);
    }
    return {...item, name: product.name, promoId: null, bundleItems: null};
  });
}

/**
 * Lines for `getDeliveryMode`, which looks at each line's category (any
 * lechon means our own rider) and the subtotal. A bundle line keeps its price
 * on its first component and adds the other components at ₱0, so a lechon
 * inside a bundle still counts without changing the subtotal.
 */
export async function deliveryLinesOf(
  lines: Array<{productId: string; price: number; quantity: number; bundleItems?: BundleComponent[] | null}>
): Promise<Array<{category?: string; price: number; quantity: number}>> {
  const ids = new Set<string>();
  for (const l of lines) {
    if (l.bundleItems?.length) l.bundleItems.forEach(c => ids.add(c.productId));
    else ids.add(l.productId);
  }
  const products = await productRepository.findManyByIds([...ids]);
  const categoryOf = new Map(products.map(p => [String(p._id), p.category]));

  return lines.flatMap(l => {
    if (!l.bundleItems?.length) {
      return [{category: categoryOf.get(l.productId), price: l.price, quantity: l.quantity}];
    }
    return l.bundleItems.map((c, i) => ({
      category: categoryOf.get(c.productId),
      price: i === 0 ? l.price : 0,
      quantity: l.quantity
    }));
  });
}

/**
 * Bundles hold no stock, so customers and the counter are shown how many the
 * items' stock can make (and unavailable when an item is off the menu).
 * Mutates and returns the plain product objects.
 */
export async function attachBundleStock<P extends Record<string, any>>(products: P[], known: P[] = products): Promise<P[]> {
  const bundles = products.filter(p => isBundleProduct(p as BundleLike));
  if (bundles.length === 0) return products;

  const byId = new Map(known.map(p => [String(p._id), p]));
  const missing = Array.from(
    new Set(bundles.flatMap(b => (b.bundleItems ?? []).map((i: any) => String(i.productId))))
  ).filter(id => !byId.has(id));
  if (missing.length > 0) {
    for (const p of await productRepository.findManyByIds(missing)) byId.set(String(p._id), p as any);
  }

  for (const bundle of bundles) {
    let canMake = Number.POSITIVE_INFINITY;
    let allOnMenu = true;
    for (const item of bundle.bundleItems ?? []) {
      const product = byId.get(String(item.productId));
      if (!product || product.isAvailable === false || product.isPreOrder === true || product.preOrderOnly === true) {
        allOnMenu = false;
        canMake = 0;
        break;
      }
      canMake = Math.min(canMake, Math.floor((product.stock ?? 0) / item.qty));
    }
    (bundle as any).stock = Number.isFinite(canMake) ? Math.max(0, canMake) : 0;
    if (!allOnMenu) (bundle as any).bundleUnavailable = true;
  }
  return products;
}
