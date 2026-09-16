import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, SQL, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  activityLogs,
  offerStats,
} from '../../database/entities/activity-logs';
import { eventLogs } from '../../database/entities/event-logs';
import { merchants } from '../../database/entities/merchants';
import { offers } from '../../database/entities/offers';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { redactJson } from '../../common/utils/redact';
import { QUEUES } from '../../queue/queue.constants';
import {
  CACHE_TTL_SECONDS,
  merchantStatusCacheKey,
} from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import type {
  ActivityListQuery,
  AdminOverview,
  MerchantHealthSnapshot,
  RecordActivityInput,
} from './types/activity.types';

const TOKEN_EXPIRING_MS = 15 * 60 * 1000;

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
    @InjectQueue(QUEUES.ACTIVITY)
    private readonly activityQueue: Queue<RecordActivityInput>,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async enqueue(input: RecordActivityInput): Promise<void> {
    try {
      await this.activityQueue.add(input.action, input);
    } catch (error) {
      this.logger.error('Failed to enqueue activity, writing inline', error);
      await this.record(input);
    }
  }

  async record(input: RecordActivityInput): Promise<void> {
    try {
      await this.db.insert(activityLogs).values({
        merchantId: input.merchantId ?? null,
        actorType: input.actorType,
        actorId: input.actorId != null ? String(input.actorId) : null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId != null ? String(input.entityId) : null,
        offerId: input.offerId ?? null,
        severity: input.severity ?? 'info',
        message: input.message ?? null,
        metadata: redactJson(input.metadata ?? {}),
      });
    } catch (error) {
      this.logger.error('Failed to persist activity log', error);
    }
  }

  async list(query: ActivityListQuery) {
    const conditions: SQL[] = [];
    if (query.merchantId) {
      conditions.push(eq(activityLogs.merchantId, query.merchantId));
    }
    if (query.action) {
      conditions.push(eq(activityLogs.action, query.action));
    }
    if (query.severity) {
      conditions.push(eq(activityLogs.severity, query.severity));
    }
    if (query.offerId) {
      conditions.push(eq(activityLogs.offerId, query.offerId));
    }

    const limit = Math.min(query.limit ?? 50, 200);
    const offset = Math.max(query.offset ?? 0, 0);

    return this.db
      .select()
      .from(activityLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getMerchantHealth(
    merchantId: number,
  ): Promise<MerchantHealthSnapshot | null> {
    const cacheKey = merchantStatusCacheKey(merchantId);
    const cached = await this.redis.get<MerchantHealthSnapshot>(cacheKey);
    if (cached) return cached;

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

    const [
      lastWebhookRows,
      lastActivityRows,
      offerCountRows,
      statsRows,
      redisConnected,
    ] = await Promise.all([
      this.db
        .select({
          eventName: eventLogs.eventName,
          eventDate: eventLogs.eventDate,
        })
        .from(eventLogs)
        .where(
          sql`${eventLogs.eventData} ->> 'merchant' = ${String(merchantId)}`,
        )
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
      this.db
        .select({
          impressions: sql<number>`coalesce(sum(${offerStats.impressions}), 0)::int`,
          clicks: sql<number>`coalesce(sum(${offerStats.clicks}), 0)::int`,
          addToCart: sql<number>`coalesce(sum(${offerStats.addToCart}), 0)::int`,
          conversions: sql<number>`coalesce(sum(${offerStats.conversions}), 0)::int`,
        })
        .from(offerStats)
        .where(eq(offerStats.merchantId, merchantId)),
      this.redis.ping(),
    ]);

    const lastWebhook = lastWebhookRows[0];
    const lastActivity = lastActivityRows[0];
    const statsRow = statsRows[0];

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
      stats: {
        impressions: statsRow?.impressions ?? 0,
        clicks: statsRow?.clicks ?? 0,
        addToCart: statsRow?.addToCart ?? 0,
        conversions: statsRow?.conversions ?? 0,
      },
      redisConnected,
    };

    await this.redis.set(cacheKey, snapshot, CACHE_TTL_SECONDS.STATUS);
    return snapshot;
  }

  async getAdminOverview(): Promise<AdminOverview> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [merchantRows, offerRows, webhookRows, recentErrors, redisConnected] =
      await Promise.all([
        this.db
          .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${merchants.isActive} = true)::int`,
            inactive: sql<number>`count(*) filter (where ${merchants.isActive} = false)::int`,
          })
          .from(merchants),
        this.db
          .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${offers.status} = 'active')::int`,
          })
          .from(offers),
        this.db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(eventLogs)
          .where(gte(eventLogs.eventDate, since)),
        this.db
          .select({
            id: activityLogs.id,
            merchantId: activityLogs.merchantId,
            action: activityLogs.action,
            message: activityLogs.message,
            createdAt: activityLogs.createdAt,
          })
          .from(activityLogs)
          .where(eq(activityLogs.severity, 'error'))
          .orderBy(desc(activityLogs.createdAt))
          .limit(20),
        this.redis.ping(),
      ]);

    const merchantRow = merchantRows[0];
    const offerRow = offerRows[0];
    const webhookRow = webhookRows[0];

    return {
      merchants: {
        total: merchantRow?.total ?? 0,
        active: merchantRow?.active ?? 0,
        inactive: merchantRow?.inactive ?? 0,
      },
      offers: {
        total: offerRow?.total ?? 0,
        active: offerRow?.active ?? 0,
      },
      webhooksLast24h: webhookRow?.count ?? 0,
      redisConnected,
      recentErrors,
    };
  }
}
