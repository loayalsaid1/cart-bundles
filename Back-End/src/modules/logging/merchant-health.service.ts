import { Injectable, Logger } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { eventLogs } from '../../database/entities/event-logs';
import { activityLogs } from '../../database/entities/activity-logs';
import { merchants } from '../../database/entities/merchants';
import { offers } from '../../database/entities/offers';
import {
  CACHE_TTL_SECONDS,
  merchantStatusCacheKey,
  merchantTotalStatsReadHashKey,
} from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import type { MerchantHealthSnapshot } from './types/activity.types';

const TOKEN_EXPIRING_MS = 15 * 60 * 1000;

@Injectable()
export class MerchantHealthService {
  private readonly logger = new Logger(MerchantHealthService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async getMerchantHealth(
    merchantId: number,
  ): Promise<MerchantHealthSnapshot | null> {
    const cacheKey = merchantStatusCacheKey(merchantId);
    const cached = await this.redis.get<MerchantHealthSnapshot>(cacheKey);
    if (cached) {
      // Always fetch the freshest analytics stats, overriding the cached ones
      const freshStats = await this.getFreshStats(merchantId);
      cached.stats = freshStats;
      return cached;
    }

    const merchant = await this.db.query.merchants.findFirst({
      where: eq(merchants.merchantId, merchantId),
    });
    if (!merchant) return null;

    const now = Date.now();
    let tokenStatus: MerchantHealthSnapshot['tokenStatus'] = 'valid';
    if (!merchant.expiresAt) {
      tokenStatus = 'missing';
    } else if (merchant.expiresAt.getTime() <= now) {
      tokenStatus = 'expired';
    } else if (merchant.expiresAt.getTime() - TOKEN_EXPIRING_MS <= now) {
      tokenStatus = 'expiring';
    }

    const [lastWebhookRows, lastActivityRows, offerCountRows, freshStats] =
      await Promise.all([
        this.db
          .select({
            eventName: eventLogs.eventName,
            eventDate: eventLogs.eventDate,
          })
          .from(eventLogs)
          .where(eq(eventLogs.merchantId, merchantId))
          .orderBy(desc(eventLogs.eventDate))
          .limit(1),
        this.db
          .select({ createdAt: activityLogs.createdAt })
          .from(activityLogs)
          .where(eq(activityLogs.merchantId, merchantId))
          .orderBy(desc(activityLogs.createdAt))
          .limit(1),
        this.db
          .select({
            status: offers.status,
            count: sql<number>`count(*)::int`,
          })
          .from(offers)
          .where(eq(offers.merchantId, merchantId))
          .groupBy(offers.status),
        this.getFreshStats(merchantId),
      ]);

    const lastWebhook = lastWebhookRows[0];
    const lastActivity = lastActivityRows[0];

    const offerCounts = {
      total: 0,
      active: 0,
      paused: 0,
      draft: 0,
      expired: 0,
    };
    for (const row of offerCountRows) {
      offerCounts.total += row.count;
      if (row.status === 'active') offerCounts.active = row.count;
      if (row.status === 'paused') offerCounts.paused = row.count;
      if (row.status === 'draft') offerCounts.draft = row.count;
      if (row.status === 'expired') offerCounts.expired = row.count;
    }

    const snapshot: MerchantHealthSnapshot = {
      merchantId,
      isActive: merchant.isActive,
      tokenStatus,
      tokenExpiresAt: merchant.expiresAt?.toISOString() ?? null,
      lastWebhookAt: lastWebhook?.eventDate?.toISOString() ?? null,
      lastWebhookEvent: lastWebhook?.eventName ?? null,
      lastActivityAt: lastActivity?.createdAt?.toISOString() ?? null,
      offerCounts,
      stats: freshStats,
    };

    // Cache the snapshot (excluding stats which are pulled live)
    await this.redis.set(cacheKey, snapshot, CACHE_TTL_SECONDS.STATUS);
    return snapshot;
  }

  private async getFreshStats(merchantId: number) {
    const statsKey = merchantTotalStatsReadHashKey(merchantId);
    const raw = await this.redis.hGetAll(statsKey);
    return {
      impressions: Number(raw.impressions ?? 0),
      clicks: Number(raw.clicks ?? 0),
      addToCart: Number(raw.addToCart ?? 0),
      conversions: Number(raw.conversions ?? 0),
    };
  }
}
