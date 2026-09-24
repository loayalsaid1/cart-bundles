import type { SallaOrderData } from '../../../webhooks/types/salla-events';

export const TERMINAL_ORDER_STATUSES = new Set([
  'canceled',
  'cancelled',
  'refunded',
  'deleted',
  'in_canceled',
  'restored',
]);

// ---------------------------------------------------------------------------
// ConversionOffer — minimal shape the matcher needs from the DB/index
// ---------------------------------------------------------------------------

export interface ConversionTarget {
  entityType: string;
  sallaEntityId: number;
}

export interface ConversionOffer {
  id: number;
  kind: string;
  /**
   * Determines which matching branch to use.
   * 'all_products'        → triggers on every product in the order
   * 'selected_products'   → targets in offer.targets (product targets)
   * 'selected_categories' → categoryIds, expanded via MatchContext
   */
  targetType: 'all_products' | 'selected_products' | 'selected_categories' | string;
  targets: ConversionTarget[];        // product targets only (entityType === 'product')
  categoryIds: number[];              // category targets
  relatedProducts: { sallaProductId: number }[];
  quantityTiers: { quantity: number }[];
  upgradeSettings: { upgradeSallaProductId: number } | null;
  recommendationSettings: {
    mode: string;
    triggerSallaProductId: number | null;
  } | null;
}

// ---------------------------------------------------------------------------
// MatchContext — carries expanded category→productId data to the matchers.
// Populated once per order event by CatalogCacheService so individual matcher
// functions don't need I/O.
// ---------------------------------------------------------------------------

export interface MatchContext {
  /** categoryId → Set of Salla product IDs belonging to that category */
  categoryProducts: Map<number, Set<number>>;
}

// ---------------------------------------------------------------------------
// Redis lock key
// ---------------------------------------------------------------------------

export function conversionLockKey(
  merchantId: number,
  orderId: number,
  offerId: number,
): string {
  return `lock:conversion:${merchantId}:${orderId}:${offerId}`;
}

// ---------------------------------------------------------------------------
// Order data extraction — trusts the Salla payload schema.
// Only real guard: product can be null when deleted after order was placed.
// ---------------------------------------------------------------------------

export function extractOrderId(data: SallaOrderData): number | null {
  return data?.id > 0 ? data.id : null;
}

export function extractOrderStatus(data: SallaOrderData): string {
  return data?.status?.slug?.toLowerCase() ?? '';
}

export function extractProductQuantities(
  data: SallaOrderData,
): Map<number, number> {
  const quantities = new Map<number, number>();
  for (const item of data.items ?? []) {
    const productId = item.product?.id;
    if (!productId) continue; // null when product was deleted from the store
    quantities.set(productId, (quantities.get(productId) ?? 0) + item.quantity);
  }
  return quantities;
}

export function extractProductAmounts(
  data: SallaOrderData,
): Map<number, number> {
  const amounts = new Map<number, number>();
  for (const item of data.items ?? []) {
    const productId = item.product?.id;
    if (!productId) continue;
    // item.amounts.total is the line total (quantity × price + options).
    // price_without_tax is the fallback when total is absent.
    const lineAmount =
      item.amounts?.total?.amount ?? item.amounts?.price_without_tax?.amount ?? 0;
    amounts.set(productId, (amounts.get(productId) ?? 0) + lineAmount);
  }
  return amounts;
}

// ---------------------------------------------------------------------------
// Public matching entry point
// ---------------------------------------------------------------------------

/**
 * Returns the subset of offers whose trigger conditions are satisfied by the
 * given order products.
 *
 * Pass `{ categoryProducts: new Map() }` when no category data is available —
 * `selected_categories` offers simply won't match.
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
  const minQty = Math.min(...offer.quantityTiers.map((t) => t.quantity));
  if (!Number.isFinite(minQty)) return false;

  const candidates = resolveTargetProductIds(offer, productIds, ctx);
  return candidates.some((id) => (quantities.get(id) ?? 0) >= minQty);
}

function matchesAddon(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  return (
    triggerPresent(offer, productIds, ctx) &&
    offer.relatedProducts.some((r) => productIds.has(r.sallaProductId))
  );
}

function matchesBundle(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  return (
    triggerPresent(offer, productIds, ctx) &&
    offer.relatedProducts.length > 0 &&
    offer.relatedProducts.every((r) => productIds.has(r.sallaProductId))
  );
}

function matchesUpgrade(
  offer: ConversionOffer,
  productIds: Set<number>,
): boolean {
  const upgradeId = offer.upgradeSettings?.upgradeSallaProductId;
  return upgradeId != null && productIds.has(upgradeId);
}

function matchesRecommendation(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  if (!offer.recommendationSettings) return false;
  const { mode, triggerSallaProductId } = offer.recommendationSettings;

  if (
    mode === 'cart_related' &&
    triggerSallaProductId != null &&
    !productIds.has(triggerSallaProductId)
  ) {
    return false;
  }

  return offer.relatedProducts.some((r) => productIds.has(r.sallaProductId));
}

// ---------------------------------------------------------------------------
// Shared helpers — dispatch on targetType, no redundant loops
// ---------------------------------------------------------------------------

/**
 * Returns true when the offer's trigger condition is met by the order products.
 * Dispatches on targetType first — no unnecessary iteration.
 */
function triggerPresent(
  offer: ConversionOffer,
  productIds: Set<number>,
  ctx: MatchContext,
): boolean {
  switch (offer.targetType) {
    case 'all_products':
      return true;

    case 'selected_products':
      return offer.targets.some((t) => productIds.has(t.sallaEntityId));

    case 'selected_categories':
      for (const catId of offer.categoryIds) {
        const catProducts = ctx.categoryProducts.get(catId);
        if (!catProducts) continue;
        for (const p of productIds) {
          if (catProducts.has(p)) return true;
        }
      }
      return false;

    default:
      // Unknown targetType: fall back to product-target check
      return offer.targets.some((t) => productIds.has(t.sallaEntityId));
  }
}

/**
 * Returns the order product IDs that are "within scope" of the offer's target.
 * Used by quantity_discount to know which products to check quantities for.
 * Dispatches on targetType — no redundant loop over both product and category targets.
 */
function resolveTargetProductIds(
  offer: ConversionOffer,
  orderProductIds: Set<number>,
  ctx: MatchContext,
): number[] {
  switch (offer.targetType) {
    case 'all_products':
      return [...orderProductIds];

    case 'selected_products':
      return offer.targets
        .map((t) => t.sallaEntityId)
        .filter((id) => orderProductIds.has(id));

    case 'selected_categories': {
      const result = new Set<number>();
      for (const catId of offer.categoryIds) {
        const catProducts = ctx.categoryProducts.get(catId);
        if (!catProducts) continue;
        for (const p of orderProductIds) {
          if (catProducts.has(p)) result.add(p);
        }
      }
      return [...result];
    }

    default:
      return offer.targets
        .map((t) => t.sallaEntityId)
        .filter((id) => orderProductIds.has(id));
  }
}
