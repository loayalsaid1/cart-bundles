import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { and, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { dailyStats, offerStats } from '../../database/entities/activity-logs';
import { offers } from '../../database/entities/offers';
import {
  OFFER_STATS_FLUSH_INTERVAL_MS,
  OFFER_STATS_FLUSH_LOCK,
  OFFER_STATS_HASH_PREFIX,
  offerStatsHashKey,
  parseOfferStatsHashKey,
  offerStatsReadHashKey,
  merchantTotalStatsReadHashKey,
} from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import type { OfferStatField } from './types/activity.types';

const PROCESSING_MARKER = ':flushing:';
const PROCESSING_TTL_SECONDS = 24 * 60 * 60;

interface StatDeltas {
  impressions: number;
  clicks: number;
  addToCart: number;
  conversions: number;
}

/**
 * Soft-CQRS counter path: storefront events increment per-offer hashes in
 * Redis, and a single periodic worker flushes them into `offer_stats` with one
 * atomic upsert per offer. This keeps the public ingest path off the DB.
 *
 * A hash is renamed to a `:flushing:` key (with a TTL) before being written.
 * If the process dies mid-flush the leftover key is re-applied on the next
 * run, so counters are never silently lost (a rare double count is the
 * accepted trade-off for a soft analytics counter).
 */
@Injectable()
export class OfferStatsService {
  private readonly logger = new Logger(OfferStatsService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async buffer(
    merchantId: number,
    offerId: number,
    field: OfferStatField,
  ): Promise<void> {
    await this.redis.hIncrBy(offerStatsHashKey(merchantId, offerId), field, 1);
  }

  /** Cheap ownership check used before writing audit rows for storefront events. */
  async isOfferOwned(merchantId: number, offerId: number): Promise<boolean> {
    const owned = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      columns: { id: true },
    });
    return Boolean(owned);
  }

  @Interval(OFFER_STATS_FLUSH_INTERVAL_MS)
  async flush(): Promise<void> {
    const lockTtlSeconds = Math.ceil(
      (OFFER_STATS_FLUSH_INTERVAL_MS * 2) / 1000,
    );
    const acquired = await this.redis.setNx(
      OFFER_STATS_FLUSH_LOCK,
      String(process.pid),
      lockTtlSeconds,
    );
    if (!acquired) return;

    try {
      const keys = await this.redis.scanKeys(`${OFFER_STATS_HASH_PREFIX}*`);
      for (const key of keys) {
        await this.flushOne(key);
      }
    } catch (error) {
      this.logger.error('Failed to flush buffered offer stats', error);
    } finally {
      await this.redis.del(OFFER_STATS_FLUSH_LOCK);
    }
  }

  private async flushOne(key: string): Promise<void> {
    const markerIndex = key.indexOf(PROCESSING_MARKER);
    const isProcessingKey = markerIndex !== -1;
    const baseKey = isProcessingKey ? key.slice(0, markerIndex) : key;

    const parsed = parseOfferStatsHashKey(baseKey);
    if (!parsed) return;

    let readKey = baseKey;
    if (!isProcessingKey) {
      // Claim the hash so concurrent increments go to a fresh key.
      readKey = `${baseKey}${PROCESSING_MARKER}${Date.now()}`;
      await this.redis.rename(baseKey, readKey);
      const client = this.redis.getClient();
      await client.expire(readKey, PROCESSING_TTL_SECONDS);
    }

    const deltas = this.toDeltas(await this.redis.hGetAll(readKey));
    if (deltas) {
      await this.applyDeltas(parsed.merchantId, parsed.offerId, deltas);
    }
    await this.redis.del(readKey);
  }

  private toDeltas(raw: Record<string, string>): StatDeltas | null {
    const deltas: StatDeltas = {
      impressions: Number(raw.impressions ?? 0),
      clicks: Number(raw.clicks ?? 0),
      addToCart: Number(raw.addToCart ?? 0),
      conversions: Number(raw.conversions ?? 0),
    };
    const total =
      deltas.impressions +
      deltas.clicks +
      deltas.addToCart +
      deltas.conversions;
    return total > 0 ? deltas : null;
  }

  private async applyDeltas(
    merchantId: number,
    offerId: number,
    deltas: StatDeltas,
  ): Promise<void> {
    const owned = await this.isOfferOwned(merchantId, offerId);
    if (!owned) {
      this.logger.warn(
        `Dropped buffered stats for offer ${offerId}: not owned by merchant ${merchantId}`,
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    await this.db
      .insert(offerStats)
      .values({ offerId, merchantId, ...deltas })
      .onConflictDoUpdate({
        target: [offerStats.offerId],
        set: {
          impressions: sql`${offerStats.impressions} + ${deltas.impressions}`,
          clicks: sql`${offerStats.clicks} + ${deltas.clicks}`,
          addToCart: sql`${offerStats.addToCart} + ${deltas.addToCart}`,
          conversions: sql`${offerStats.conversions} + ${deltas.conversions}`,
          updatedAt: new Date(),
        },
      });

    await this.db
      .insert(dailyStats)
      .values({ merchantId, date: today, ...deltas })
      .onConflictDoUpdate({
        target: [dailyStats.merchantId, dailyStats.date],
        set: {
          impressions: sql`${dailyStats.impressions} + ${deltas.impressions}`,
          clicks: sql`${dailyStats.clicks} + ${deltas.clicks}`,
          addToCart: sql`${dailyStats.addToCart} + ${deltas.addToCart}`,
          conversions: sql`${dailyStats.conversions} + ${deltas.conversions}`,
          updatedAt: new Date(),
        },
      });

    // CQRS Dual Write: update the Redis read-model key
    const readKey = offerStatsReadHashKey(merchantId, offerId);
    const merchantKey = merchantTotalStatsReadHashKey(merchantId);
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    if (deltas.impressions) {
      pipeline.hincrby(readKey, 'impressions', deltas.impressions);
      pipeline.hincrby(merchantKey, 'impressions', deltas.impressions);
    }
    if (deltas.clicks) {
      pipeline.hincrby(readKey, 'clicks', deltas.clicks);
      pipeline.hincrby(merchantKey, 'clicks', deltas.clicks);
    }
    if (deltas.addToCart) {
      pipeline.hincrby(readKey, 'addToCart', deltas.addToCart);
      pipeline.hincrby(merchantKey, 'addToCart', deltas.addToCart);
    }
    if (deltas.conversions) {
      pipeline.hincrby(readKey, 'conversions', deltas.conversions);
      pipeline.hincrby(merchantKey, 'conversions', deltas.conversions);
    }
    await pipeline.exec();
  }
}
