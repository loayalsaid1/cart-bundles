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

export function extractOrderId(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const raw = data.id ?? data.order_id;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function extractProductQuantities(
  payload: unknown,
): Map<number, number> {
  const quantities = new Map<number, number>();
  if (!payload || typeof payload !== 'object') return quantities;
  const data = payload as Record<string, unknown>;
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.products)
      ? data.products
      : [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const product =
      row.product && typeof row.product === 'object'
        ? (row.product as Record<string, unknown>)
        : null;
    const productId = Number(
      row.product_id ?? row.id ?? product?.id ?? product?.product_id,
    );
    const quantity = Number(row.quantity ?? row.qty ?? 1);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    quantities.set(
      productId,
      (quantities.get(productId) ?? 0) +
        (Number.isFinite(quantity) && quantity > 0 ? quantity : 1),
    );
  }
  return quantities;
}

function asStatusSlug(value: unknown): string {
  if (typeof value === 'string') return value.toLowerCase();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.slug === 'string') return record.slug.toLowerCase();
    if (typeof record.code === 'string') return record.code.toLowerCase();
  }
  return '';
}

export function extractOrderStatus(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  return asStatusSlug(data.status);
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
