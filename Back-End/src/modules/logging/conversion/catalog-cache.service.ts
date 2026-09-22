import { Injectable, Logger } from '@nestjs/common';
import {
  CATEGORY_PRODUCTS_TTL_SECONDS,
  categoryProductsKey,
  categoryProductsPrefix,
} from '../../../redis/redis.constants';
import { RedisService } from '../../../redis/redis.service';
import { MerchantsService } from '../../merchants/merchants.service';
import type { MatchContext } from './matchers/order-conversion.matcher';

interface SallaCategoryProductsResponse {
  data: Array<{ id: number }>;
  pagination: {
    currentPage: number;
    totalPages: number;
  };
}

@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly merchantsService: MerchantsService,
  ) {}

  /**
   * Builds the MatchContext for a set of category IDs.
   *
   * Strategy:
   * 1. Read all requested categories from Redis in parallel — no token needed.
   * 2. If all are cached → return immediately.
   * 3. If there are cache misses → resolve the Salla access token once, fetch
   *    only the missing categories from the API, cache results.
   * 4. If the token is unavailable → log a warning and return whatever we got
   *    from cache. Orders still match for cached categories; only the uncached
   *    ones are skipped for this event.
   */
  async buildMatchContext(
    merchantId: number,
    categoryIds: number[],
  ): Promise<MatchContext> {
    if (categoryIds.length === 0) {
      return { categoryProducts: new Map() };
    }

    const categoryProducts = new Map<number, Set<number>>();
    const misses: number[] = [];

    // Pass 1: Redis — no API call, no token
    await Promise.all(
      categoryIds.map(async (catId) => {
        const cached = await this.redis.get<number[]>(
          categoryProductsKey(merchantId, catId),
        );
        if (cached !== null) {
          categoryProducts.set(catId, new Set(cached));
        } else {
          misses.push(catId);
        }
      }),
    );

    if (misses.length === 0) return { categoryProducts };

    // Pass 2: Salla API for cache misses only
    const tokenResult = await this.merchantsService.getValidAccessToken(merchantId);
    if (!tokenResult.success) {
      this.logger.warn(
        `Merchant ${merchantId}: Salla token unavailable — ` +
          `${misses.length} uncached categories will not match this order event`,
      );
      // Return what we have from cache; partial matching is better than none.
      return { categoryProducts };
    }

    await Promise.all(
      misses.map(async (catId) => {
        const productIds = await this.fetchFromSalla(catId, tokenResult.accessToken);
        categoryProducts.set(catId, new Set(productIds));
        // Best-effort cache — non-fatal if Redis is temporarily unavailable
        await this.redis
          .set(categoryProductsKey(merchantId, catId), productIds, CATEGORY_PRODUCTS_TTL_SECONDS)
          .catch((err) =>
            this.logger.error(
              `Failed to cache products for category ${catId} (merchant ${merchantId})`,
              err,
            ),
          );
      }),
    );

    return { categoryProducts };
  }

  /**
   * Drop all cached category-product lists for a merchant.
   * Call on category.* and product.* webhook events.
   */
  async invalidate(merchantId: number): Promise<void> {
    await this.redis.delByPrefix(categoryProductsPrefix(merchantId));
  }

  // ---------------------------------------------------------------------------

  private async fetchFromSalla(
    categoryId: number,
    accessToken: string,
  ): Promise<number[]> {
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
        res = await fetch(
          `https://api.salla.dev/admin/v2/categories/${categoryId}/products?page=${page}`,
          { headers },
        );
      } catch (err) {
        this.logger.error(
          `Network error fetching category ${categoryId} page ${page}`,
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
        productIds.push(item.id);
      }

      totalPages = body.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return productIds;
  }
}
