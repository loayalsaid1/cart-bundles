export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const CACHE_TTL_SECONDS = {
  PRODUCTS: 5 * 60,
  CATEGORIES: 10 * 60,
  COUPONS: 5 * 60,
  STOREFRONT_OFFERS: 5 * 60,
  DASHBOARD: 30,
  STATUS: 60,
} as const;

export const CACHE_PREFIX = {
  TOKEN: 'merchant:token:',
  PRODUCTS: 'salla:products:',
  CATEGORIES: 'salla:categories:',
  COUPONS: 'salla:coupons:',
  STOREFRONT: 'offers:storefront:',
  DASHBOARD: 'offers:dashboard:',
  STATUS: 'status:merchant:',
} as const;

export function productsCacheKey(merchantId: number, keyword?: string): string {
  return `${CACHE_PREFIX.PRODUCTS}${merchantId}:${keyword?.trim().toLowerCase() || '_'}`;
}

export function recommendedProductsCacheKey(merchantId: number): string {
  return `${CACHE_PREFIX.PRODUCTS}${merchantId}:_recommended_sale`;
}

export function categoriesCacheKey(
  merchantId: number,
  keyword?: string,
): string {
  return `${CACHE_PREFIX.CATEGORIES}${merchantId}:${keyword?.trim().toLowerCase() || '_'}`;
}

export function couponsCacheKey(merchantId: number, keyword?: string): string {
  return `${CACHE_PREFIX.COUPONS}${merchantId}:${keyword?.trim().toLowerCase() || '_'}`;
}

export function storefrontOffersCacheKey(
  merchantId: number,
  productId?: number,
  categoryIds?: number[],
): string {
  const cats =
    categoryIds
      ?.slice()
      .sort((a, b) => a - b)
      .join(',') || '_';
  return `${CACHE_PREFIX.STOREFRONT}${merchantId}:${productId ?? '_'}:${cats}`;
}

export function merchantTokenCacheKey(merchantId: number): string {
  return `${CACHE_PREFIX.TOKEN}${merchantId}`;
}

export function merchantStatusCacheKey(merchantId: number): string {
  return `${CACHE_PREFIX.STATUS}${merchantId}`;
}

export function merchantCatalogPrefixes(merchantId: number): string[] {
  return [
    `${CACHE_PREFIX.PRODUCTS}${merchantId}:`,
    `${CACHE_PREFIX.CATEGORIES}${merchantId}:`,
    `${CACHE_PREFIX.COUPONS}${merchantId}:`,
  ];
}

export function merchantStorefrontPrefix(merchantId: number): string {
  return `${CACHE_PREFIX.STOREFRONT}${merchantId}:`;
}

export function dashboardOffersCacheKey(
  merchantId: number,
  filters: {
    search?: string;
    productId?: number;
    type?: string;
    status?: string;
  },
): string {
  const normalized = (['search', 'productId', 'type', 'status'] as const)
    .map((key) => `${key}=${filters[key] ?? ''}`)
    .join('&');
  return `${CACHE_PREFIX.DASHBOARD}${merchantId}:${normalized}`;
}

export function merchantDashboardPrefix(merchantId: number): string {
  return `${CACHE_PREFIX.DASHBOARD}${merchantId}:`;
}

/** Pending offer-stat deltas buffered in Redis before a bulk DB flush. */
export const OFFER_STATS_HASH_PREFIX = 'stats:offer:';
export const OFFER_STATS_FLUSH_LOCK = 'lock:offer-stats:flush';
export const OFFER_STATS_FLUSH_INTERVAL_MS = 10_000;

export function offerStatsHashKey(merchantId: number, offerId: number): string {
  return `${OFFER_STATS_HASH_PREFIX}${merchantId}:${offerId}`;
}

export function parseOfferStatsHashKey(
  key: string,
): { merchantId: number; offerId: number } | null {
  const parts = key.split(':');
  if (parts.length !== 4 || parts[0] !== 'stats' || parts[1] !== 'offer') {
    return null;
  }
  const merchantId = Number(parts[2]);
  const offerId = Number(parts[3]);
  if (!Number.isInteger(merchantId) || !Number.isInteger(offerId)) return null;
  return { merchantId, offerId };
}

/** Per-merchant inverted offer-match index, serialized as JSON. */
export const OFFER_MATCH_INDEX_PREFIX = 'match:offer-index:';
export const OFFER_MATCH_INDEX_TTL_SECONDS = 10 * 60;

export function offerMatchIndexKey(merchantId: number): string {
  return `${OFFER_MATCH_INDEX_PREFIX}${merchantId}`;
}

export const OFFER_STATS_READ_PREFIX = 'stats:read:';

export function offerStatsReadHashKey(merchantId: number, offerId: number): string {
  return `${OFFER_STATS_READ_PREFIX}${merchantId}:${offerId}`;
}

export function merchantStatsReadPrefix(merchantId: number): string {
  return `${OFFER_STATS_READ_PREFIX}${merchantId}:`;
}

export function merchantTotalStatsReadHashKey(merchantId: number): string {
  return `${OFFER_STATS_READ_PREFIX}merchant:${merchantId}`;
}
