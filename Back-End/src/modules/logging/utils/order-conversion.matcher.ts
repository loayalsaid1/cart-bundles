import type { SallaOrderData } from '../../webhooks/types/salla-events';

export const TERMINAL_ORDER_STATUSES = new Set([
  'canceled',
  'cancelled',
  'refunded',
  'deleted',
  'in_canceled',
  'restored',
]);

// ---------------------------------------------------------------------------
// Offer shape expected by the matcher
// ---------------------------------------------------------------------------

export interface ConversionTarget {
  entityType: string;
  sallaEntityId: number;
}

export interface ConversionRelatedProduct {
  sallaProductId: number;
}

export interface ConversionQuantityTier {
  quantity: number;
}

export interface ConversionOffer {
  id: number;
  kind: string;
  targetType: string;
  /** Product-entity targets (entityType === 'product') */
  targets: ConversionTarget[];
  /** Category IDs extracted from targets where entityType === 'category' */
  categoryIds: number[];
  relatedProducts: ConversionRelatedProduct[];
  quantityTiers: ConversionQuantityTier[];
  upgradeSettings: { upgradeSallaProductId: number } | null;
  recommendationSettings: {
    mode: string;
    triggerSallaProductId: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Context passed into matching — carries the expanded category→product map
// so the matcher never has to fetch data itself.
// ---------------------------------------------------------------------------

export interface MatchContext {
  /**
   * Maps Salla categoryId → Set of Salla productIds belonging to that category.
   * Built once per order event from the CatalogCacheService, then passed down.
   * Missing entries are treated as empty sets (category products unknown → no match).
   */
  categoryProducts: Map<number, Set<number>>;
}

// ---------------------------------------------------------------------------
// Redis lock key helpers
// ---------------------------------------------------------------------------

export function conversionLockKey(
  merchantId: number,
  orderId: number,
  offerId: number,
): string {
  return `lock:conversion:${merchantId}:${orderId}:${offerId}`;
}

// ---------------------------------------------------------------------------
// Order data extraction helpers
// ---------------------------------------------------------------------------

export function extractOrderId(data: SallaOrderData): number | null {
  if (!data?.id) return null;
  const id = Number(data.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function extractOrderStatus(data: SallaOrderData): string {
  if (!data?.status?.slug) return '';
  return data.status.slug.toLowerCase();
}

export function extractProductQuantities(
  data: SallaOrderData,
): Map<number, number> {
  const quantities = new Map<number, number>();

  if (!Array.isArray(data?.items)) return quantities;

  for (const item of data.items) {
    const productId = Number(item.product?.id);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(productId) || productId <= 0) continue;

    quantities.set(
      productId,
      (quantities.get(productId) ?? 0) +
        (Number.isFinite(quantity) && quantity > 0 ? quantity : 1),
    );
  }
  return quantities;
}

export function extractProductAmounts(
  data: SallaOrderData,
): Map<number, number> {
  const amounts = new Map<number, number>();

  if (!Array.isArray(data?.items)) return amounts;

  for (const item of data.items) {
    const productId = Number(item.product?.id);
    if (!Number.isInteger(productId) || productId <= 0) continue;

    const total = item.amounts?.total?.amount;
    const fallback = item.amounts?.price_without_tax?.amount;

    let lineAmount = 0;
    if (typeof total === 'number' && Number.isFinite(total) && total >= 0) {
      lineAmount = total;
    } else if (
      typeof fallback === 'number' &&
      Number.isFinite(fallback) &&
      fallback >= 0
    ) {
      lineAmount = fallback;
    }

    amounts.set(productId, (amounts.get(productId) ?? 0) + lineAmount);
  }
  return amounts;
}

// ---------------------------------------------------------------------------
// Public matching entry point
// ---------------------------------------------------------------------------

/**
 * Returns the subset of `merchantOffers` whose trigger conditions are met by
 * the given order products.  Pass an empty `MatchContext` when no category
 * expansion data is available — category-targeted offers will simply not match.
 */
export function matchOffers(
  merchantOffers: ConversionOffer[],
  quantities: Map<number, number>,
  ctx: MatchContext = { categoryProducts: new Map() },
): ConversionOffer[] {
  const productIds = new Set(quantities.keys());
  return merchantOffers.filter((offer) =>
    offerMatches(offer, productIds, quantities, ctx),
  );
}

// ---------------------------------------------------------------------------
// Per-offer dispatch
// ---------------------------------------------------------------------------

function offerMatches(
  offer: ConversionOffer,
  productIds: Set<number>,
  quantities: Map<number, number>,
  ctx: MatchContext,
): boolean {
  switch (offer.kind) {
    case 'quantity_discount':
      return matchesQuantity(offer, productIds, quantities, ctx);
    case 'product_add_on':
      return matchesAddon(offer, productIds, ctx);
    case 'bundle':
      return matchesBundle(offer, productIds, ctx);
    case 'upgrade_offer':
      return matchesUpgrade(offer, productIds);
    case 'cart_recommendation':
      return matchesRecommendation(offer, productIds, ctx);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Type-specific matchers
// ---------------------------------------------------------------------------

function matchesQuantity(
  offer: ConversionOffer,
  productIds: Set<number>,
  quantities: Map<number, number>,
  ctx: MatchContext,
): boolean {
  const minQty = Math.min(
    ...offer.quantityTiers.map((tier) => tier.quantity),
    Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(minQty)) return false;

  const candidateIds = resolveTargetProductIds(offer, productIds, ctx);
  return candidateIds.some((id) => (quantities.get(id) ?? 0) >= minQty);
}

function matchesAddon(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  if (!triggerPresent(offer, productIds, ctx)) return false;
  return offer.relatedProducts.some((row) => productIds.has(row.sallaProductId));
}

function matchesBundle(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  if (!triggerPresent(offer, productIds, ctx)) return false;
  if (offer.relatedProducts.length === 0) return false;
  return offer.relatedProducts.every((row) => productIds.has(row.sallaProductId));
}

function matchesUpgrade(
  offer: ConversionOffer,
  productIds: Set<number>,
): boolean {
  const upgradeId = offer.upgradeSettings?.upgradeSallaProductId;
  if (!upgradeId) return false;
  return productIds.has(upgradeId);
}

function matchesRecommendation(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  const settings = offer.recommendationSettings;
  if (!settings) return false;

  // cart_related mode: the trigger product must be in the order
  if (
    settings.mode === 'cart_related' &&
    settings.triggerSallaProductId &&
    !productIds.has(settings.triggerSallaProductId)
  ) {
    return false;
  }

  return offer.relatedProducts.some((row) => productIds.has(row.sallaProductId));
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when at least one of the offer's trigger targets (product or
 * category) is represented in the order's productIds.
 */
function triggerPresent(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  if (offer.targetType === 'all_products') return true;

  const productTargets = offer.targets.filter(
    (t) => t.entityType === 'product',
  );

  if (productTargets.length > 0) {
    if (productTargets.some((t) => productIds.has(t.sallaEntityId))) return true;
  }

  // Fall through to category expansion
  for (const catId of offer.categoryIds) {
    const catProducts = ctx.categoryProducts.get(catId);
    if (catProducts && [...productIds].some((p) => catProducts.has(p))) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the effective set of candidate product IDs for an offer, accounting
 * for all_products, product targets, and category expansion.
 */
function resolveTargetProductIds(
  offer: ConversionOffer,
  orderProductIds: Set<number>,
  ctx: MatchContext,
): number[] {
  if (offer.targetType === 'all_products' || offer.targets.length === 0) {
    return [...orderProductIds];
  }

  const result = new Set<number>();

  // Direct product targets that are in the order
  for (const t of offer.targets) {
    if (t.entityType === 'product' && orderProductIds.has(t.sallaEntityId)) {
      result.add(t.sallaEntityId);
    }
  }

  // Category targets — expand and intersect with order products
  for (const catId of offer.categoryIds) {
    const catProducts = ctx.categoryProducts.get(catId) ?? new Set<number>();
    for (const p of orderProductIds) {
      if (catProducts.has(p)) result.add(p);
    }
  }

  return [...result];
}