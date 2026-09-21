import type { SallaOrderData } from '../../webhooks/types/salla-events';

export const TERMINAL_ORDER_STATUSES = new Set([
  'canceled',
  'cancelled',
  'refunded',
  'deleted',
  'in_canceled',
  'restored',
]);

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
  targets: ConversionTarget[];
  relatedProducts: ConversionRelatedProduct[];
  quantityTiers: ConversionQuantityTier[];
  upgradeSettings: { upgradeSallaProductId: number } | null;
  recommendationSettings: {
    mode: string;
    triggerSallaProductId: number | null;
  } | null;
}

export function conversionLockKey(
  merchantId: number,
  orderId: number,
  offerId: number,
): string {
  return `lock:conversion:${merchantId}:${orderId}:${offerId}`;
}

// STRCITLY TYPED EXTRACTION FUNCTIONS
export function extractOrderId(data: SallaOrderData): number | null {
  if (!data?.id) return null;
  const id = Number(data.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function extractOrderStatus(data: SallaOrderData): string {
  if (!data?.status?.slug) return '';
  return data.status.slug.toLowerCase();
}

export function extractProductQuantities(data: SallaOrderData): Map<number, number> {
  const quantities = new Map<number, number>();
  
  if (!Array.isArray(data?.items)) return quantities;

  for (const item of data.items) {
    // Salla wraps the actual product details inside item.product
    // If the product was deleted from the store, item.product might be null
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

export function extractProductAmounts(data: SallaOrderData): Map<number, number> {
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

export function matchOffers(
  merchantOffers: ConversionOffer[],
  quantities: Map<number, number>,
): number[] {
  const matched: number[] = [];
  const productIds = new Set(quantities.keys());

  for (const offer of merchantOffers) {
    if (offerMatches(offer, productIds, quantities)) {
      matched.push(offer.id);
    }
  }
  return matched;
}

function offerMatches(
  offer: ConversionOffer,
  productIds: Set<number>,
  quantities: Map<number, number>,
): boolean {
  switch (offer.kind) {
    case 'quantity_discount':
      return matchesQuantity(offer, productIds, quantities);
    case 'product_add_on':
      return matchesAddon(offer, productIds);
    case 'bundle':
      return matchesBundle(offer, productIds);
    case 'upgrade_offer':
      return matchesUpgrade(offer, productIds);
    case 'cart_recommendation':
      return matchesRecommendation(offer, productIds);
    default:
      return false;
  }
}

function matchesQuantity(
  offer: ConversionOffer,
  productIds: Set<number>,
  quantities: Map<number, number>,
): boolean {
  const minQty = Math.min(
    ...offer.quantityTiers.map((tier) => tier.quantity),
    Number.POSITIVE_INFINITY,
  );
  if (!Number.isFinite(minQty)) return false;

  const productTargets = offer.targets.filter(
    (target) => target.entityType === 'product',
  );
  const candidateIds =
    offer.targetType === 'all_products' || productTargets.length === 0
      ? [...productIds]
      : productTargets
          .map((target) => target.sallaEntityId)
          .filter((id) => productIds.has(id));

  return candidateIds.some((id) => (quantities.get(id) ?? 0) >= minQty);
}

function matchesAddon(
  offer: ConversionOffer,
  productIds: Set<number>,
): boolean {
  if (!triggerPresent(offer, productIds)) return false;
  return offer.relatedProducts.some((row) =>
    productIds.has(row.sallaProductId),
  );
}

function matchesBundle(
  offer: ConversionOffer,
  productIds: Set<number>,
): boolean {
  if (!triggerPresent(offer, productIds)) return false;
  if (offer.relatedProducts.length === 0) return false;
  return offer.relatedProducts.every((row) =>
    productIds.has(row.sallaProductId),
  );
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
): boolean {
  const settings = offer.recommendationSettings;
  if (!settings) return false;
  if (
    settings.mode === 'cart_related' &&
    settings.triggerSallaProductId &&
    !productIds.has(settings.triggerSallaProductId)
  ) {
    return false;
  }
  return offer.relatedProducts.some((row) =>
    productIds.has(row.sallaProductId),
  );
}

function triggerPresent(
  offer: ConversionOffer,
  productIds: Set<number>,
): boolean {
  const productTargets = offer.targets.filter(
    (target) => target.entityType === 'product',
  );
  if (offer.targetType === 'all_products' || productTargets.length === 0) {
    return true;
  }
  return productTargets.some((target) => productIds.has(target.sallaEntityId));
}