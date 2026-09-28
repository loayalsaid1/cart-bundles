import { Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { offers } from '../../../database/entities/offers';
import {
  OFFER_MATCH_INDEX_TTL_SECONDS,
  offerMatchIndexKey,
} from '../../../redis/redis.constants';
import { RedisService } from '../../../redis/redis.service';
import type { ConversionOffer } from './matchers/order-conversion.matcher';
import {
  buildOfferIndex,
  deserializeIndex,
  type OfferMatchIndex,
  serializeIndex,
} from './matchers/offer-match-index';

@Injectable()
export class OfferIndexCacheService {
  private readonly logger = new Logger(OfferIndexCacheService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  /**
   * Returns the pre-built inverted offer index for a merchant.
   * Cache-first: on a Redis hit we deserialize and return; on a miss we query
   * the DB, build the index, store it, and return it.
   *
   * The `redis.getOrSet` helper already de-dupes concurrent build requests
   * for the same merchant via an in-flight Map, so we can safely inject this
   * in a queue worker without a thundering-herd issue.
   */
  async getOrBuild(merchantId: number): Promise<OfferMatchIndex> {
    const cacheKey = offerMatchIndexKey(merchantId);

    const raw = await this.redis.get<string>(cacheKey);
    if (raw) {
      try {
        return deserializeIndex(raw);
      } catch {
        this.logger.warn(
          `Corrupt offer index cache for merchant ${merchantId} — rebuilding`,
        );
      }
    }

    const index = await this.buildFromDb(merchantId);
    try {
      await this.redis.set(cacheKey, serializeIndex(index), OFFER_MATCH_INDEX_TTL_SECONDS);
    } catch (err) {
      // Non-fatal: we still return the freshly built index
      this.logger.error(
        `Failed to store offer index for merchant ${merchantId}`,
        err,
      );
    }
    return index;
  }

  /**
   * Drop the cached index for a merchant.
   * Call this whenever an offer is created, updated, paused, or deleted so
   * the next order event triggers a fresh build from DB.
   */
  async invalidate(merchantId: number): Promise<void> {
    await this.redis.del(offerMatchIndexKey(merchantId));
  }

  // ---------------------------------------------------------------------------
  // Private: load from DB and build
  // ---------------------------------------------------------------------------

  private async buildFromDb(merchantId: number): Promise<OfferMatchIndex> {
    const rows = await this.db.query.offers.findMany({
      where: and(
        eq(offers.merchantId, merchantId),
        eq(offers.status, 'active'),
      ),
      with: {
        targets: true,
        relatedProducts: true,
        quantityTiers: true,
        upgradeSettings: true,
        recommendationSettings: true,
      },
    });

    const conversionOffers: ConversionOffer[] = rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      targetType: row.targetType,
      // Split targets into product targets and category IDs
      targets: row.targets
        .filter((t) => t.entityType === 'product')
        .map((t) => ({
          entityType: t.entityType,
          sallaEntityId: t.sallaEntityId,
        })),
      categoryIds: row.targets
        .filter((t) => t.entityType === 'category')
        .map((t) => t.sallaEntityId),
      relatedProducts: row.relatedProducts.map((r) => ({
        sallaProductId: r.sallaProductId,
      })),
      quantityTiers: row.quantityTiers.map((t) => ({
        quantity: t.quantity,
      })),
      upgradeSettings: row.upgradeSettings
        ? {
            upgradeSallaProductId:
              row.upgradeSettings.upgradeSallaProductId,
          }
        : null,
      recommendationSettings: row.recommendationSettings
        ? {
            mode: row.recommendationSettings.mode,
            triggerSallaProductId:
              row.recommendationSettings.triggerSallaProductId,
          }
        : null,
    }));

    return buildOfferIndex(conversionOffers);
  }
}
