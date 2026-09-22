import { Injectable, Logger } from '@nestjs/common';
import {
  CACHE_TTL_SECONDS,
  CACHE_PREFIX,
} from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import { MerchantsService } from '../merchants/merchants.service';
import type { MatchContext } from './utils/order-conversion.matcher';

// ---------------------------------------------------------------------------
// Redis key helpers (private to this service)
// ---------------------------------------------------------------------------

/** Stores a JSON array of product IDs for a specific category. */
function catProductsKey(merchantId: number, categoryId: number): string {
  return `${CACHE_PREFIX.CATEGORIES}${merchantId}:cat-products:${categoryId}`;
}

/** Matches all cat-product keys for a merchant — used for bulk invalidation. */
export function catProductsPrefix(merchantId: number): string {
  return `${CACHE_PREFIX.CATEGORIES}${merchantId}:cat-products:`;
}

// Re-use the existing CATEGORIES TTL (10 min). Webhook invalidation keeps it fresh.
const CATEGORY_PRODUCTS_TTL = CACHE_TTL_SECONDS.CATEGORIES;

// ---------------------------------------------------------------------------
// Salla API types (minimal)
// ---------------------------------------------------------------------------

interface SallaCategoryProductItem {
  id: number;
}

interface SallaCategoryProductsResponse {
  data: SallaCategoryProductItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly merchantsService: MerchantsService,
  ) {}

  /**
   * Builds the MatchContext for a set of category IDs.
   * Each category's product list is served from Redis; misses trigger a
   * Salla API call (with pagination) and the result is cached.
   *
   * If the access token cannot be resolved we return an empty context —
   * category-targeted offers simply won't match for this order event.
   */
  async buildMatchContext(
    merchantId: number,
    categoryIds: number[],
  ): Promise<MatchContext> {
    if (categoryIds.length === 0) {
      return { categoryProducts: new Map() };
    }

    const tokenResult = await this.merchantsService.getValidAccessToken(merchantId);
    if (!tokenResult.success) {
      this.logger.warn(
        `Cannot resolve category products for merchant ${merchantId}: no valid token`,
      );
      return { categoryProducts: new Map() };
    }

    const categoryProducts = new Map<number, Set<number>>();

    await Promise.all(
      categoryIds.map(async (catId) => {
        const products = await this.getCategoryProducts(
          merchantId,
          catId,
          tokenResult.accessToken,
        );
        categoryProducts.set(catId, products);
      }),
    );

    return { categoryProducts };
  }

  /**
   * Drop all cached category-product lists for a merchant.
   * Called when `category.updated`, `category.deleted`, `product.updated`,
   * or `product.deleted` webhooks arrive.
   */
  async invalidate(merchantId: number): Promise<void> {
    await this.redis.delByPrefix(catProductsPrefix(merchantId));
  }

  // ---------------------------------------------------------------------------
  // Private: per-category fetch with cache
  // ---------------------------------------------------------------------------

  private async getCategoryProducts(
    merchantId: number,
    categoryId: number,
    accessToken: string,
  ): Promise<Set<number>> {
    const key = catProductsKey(merchantId, categoryId);

    // Cache hit: stored as a JSON array of product IDs
    const cached = await this.redis.get<number[]>(key);
    if (cached) return new Set(cached);

    const productIds = await this.fetchFromSalla(categoryId, accessToken);

    try {
      await this.redis.set(key, productIds, CATEGORY_PRODUCTS_TTL);
    } catch (err) {
      this.logger.error(
        `Failed to cache products for category ${categoryId} (merchant ${merchantId})`,
        err,
      );
    }

    return new Set(productIds);
  }

  /**
   * Calls Salla `GET /admin/v2/categories/{id}/products` with full pagination.
   * Returns an array of Salla product IDs.
   */
  private async fetchFromSalla(
    categoryId: number,
    accessToken: string,
  ): Promise<number[]> {
    const baseUrl = `https://api.salla.dev/admin/v2/categories/${categoryId}/products`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    const productIds: number[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}?page=${page}`, { headers });
      } catch (err) {
        this.logger.error(
          `Network error fetching products for category ${categoryId} page ${page}`,
          err,
        );
        break;
      }

      if (!res.ok) {
        this.logger.warn(
          `Salla returned ${res.status} for category ${categoryId} page ${page}`,
        );
        break;
      }

      const body = (await res.json()) as SallaCategoryProductsResponse;

      for (const item of body.data ?? []) {
        if (item?.id && Number.isInteger(item.id)) {
          productIds.push(item.id);
        }
      }

      totalPages = body.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return productIds;
  }
}
