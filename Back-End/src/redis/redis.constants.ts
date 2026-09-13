export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const QUEUES = {
  WEBHOOKS: 'salla-webhooks',
  ACTIVITY: 'app-activity',
  STOREFRONT: 'storefront-events',
} as const;

export const CACHE_TTL_SECONDS = {
  PRODUCTS: 5 * 60,
  CATEGORIES: 10 * 60,
  COUPONS: 5 * 60,
  STOREFRONT_OFFERS: 60,
  STATUS: 30,
} as const;

export const CACHE_PREFIX = {
  TOKEN: 'merchant:token:',
  PRODUCTS: 'salla:products:',
  CATEGORIES: 'salla:categories:',
  COUPONS: 'salla:coupons:',
  STOREFRONT: 'offers:storefront:',
  STATUS: 'status:merchant:',
} as const;

export function productsCacheKey(merchantId: number, keyword?: string): string {
  return `${CACHE_PREFIX.PRODUCTS}${merchantId}:${keyword?.trim().toLowerCase() || '_'}`;
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
  const cats = categoryIds?.slice().sort((a, b) => a - b).join(',') || '_';
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

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 2_000 },
};
