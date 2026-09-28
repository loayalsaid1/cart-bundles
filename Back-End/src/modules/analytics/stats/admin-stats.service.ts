import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { activityLogs, dailyStats, offerStats } from '../../../database/entities/activity-logs';
import { merchants } from '../../../database/entities/merchants';
import { offers } from '../../../database/entities/offers';
import { QueueHealthService } from '../../../queue/queue-health.service';
import { RedisService } from '../../../redis/redis.service';
import { MerchantHealthService } from './merchant-health.service';
import type {
  AdminMerchantDetail,
  AdminMerchantRow,
  AdminOverview,
} from '../types/stats.types';

const ADMIN_OVERVIEW_CACHE_KEY = 'admin:overview:v2';
const ADMIN_OVERVIEW_TTL_SECONDS = 60;

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
    private readonly queueHealthService: QueueHealthService,
    private readonly merchantHealthService: MerchantHealthService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async getAdminOverview(): Promise<AdminOverview> {
    const cached = await this.redis.get<AdminOverview>(
      ADMIN_OVERVIEW_CACHE_KEY,
    );
    if (cached) return cached;

    const fourteenDaysAgoStr = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [
      merchantRows,
      offerRows,
      kindBreakdownRows,
      zeroOffersRows,
      platformStatsRows,
      topMerchantsRows,
      queueHealth,
      recentErrors,
      dailyPerfRows,
    ] = await Promise.all([
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
          kind: offers.kind,
          count: sql<number>`count(*)::int`,
        })
        .from(offers)
        .where(eq(offers.status, 'active'))
        .groupBy(offers.kind),

      this.db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(merchants)
        .where(
          and(
            eq(merchants.isActive, true),
            sql`not exists (
              select 1 from ${offers} 
              where ${offers.merchantId} = ${merchants.merchantId} 
              and ${offers.status} = 'active'
            )`,
          ),
        ),

      this.db
        .select({
          revenueAttributed: sql<string>`coalesce(sum(${offerStats.revenueAttributed}), 0)::text`,
          conversions: sql<number>`coalesce(sum(${offerStats.conversions}), 0)::int`,
        })
        .from(offerStats),

      this.db
        .select({
          merchantId: offerStats.merchantId,
          storeName: merchants.storeName,
          conversions: sql<number>`coalesce(sum(${offerStats.conversions}), 0)::int`,
          revenueAttributed: sql<string>`coalesce(sum(${offerStats.revenueAttributed}), 0)::text`,
        })
        .from(offerStats)
        .leftJoin(merchants, eq(offerStats.merchantId, merchants.merchantId))
        .groupBy(offerStats.merchantId, merchants.storeName)
        .orderBy(desc(sql`sum(${offerStats.conversions})`))
        .limit(5),

      this.queueHealthService.getFailedCounts(),

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

      this.db
        .select({
          date: dailyStats.date,
          impressions: sql<number>`coalesce(sum(${dailyStats.impressions}), 0)::int`,
          conversions: sql<number>`coalesce(sum(${dailyStats.conversions}), 0)::int`,
        })
        .from(dailyStats)
        .where(gte(dailyStats.date, fourteenDaysAgoStr))
        .groupBy(dailyStats.date)
        .orderBy(dailyStats.date),
    ]);

    const merchantRow = merchantRows[0];
    const offerRow = offerRows[0];
    const platformStats = platformStatsRows[0];
    const zeroOffersCount = zeroOffersRows[0]?.count ?? 0;

    const kindBreakdown: Record<string, number> = {};
    for (const r of kindBreakdownRows) {
      if (r.kind) {
        kindBreakdown[r.kind] = r.count;
      }
    }

    const failedSum =
      queueHealth.webhooksFailed +
      queueHealth.activityFailed +
      queueHealth.storefrontFailed;

    const overview: AdminOverview = {
      merchants: {
        total: merchantRow?.total ?? 0,
        active: merchantRow?.active ?? 0,
        inactive: merchantRow?.inactive ?? 0,
        zeroOffersCount,
      },
      offers: {
        total: offerRow?.total ?? 0,
        active: offerRow?.active ?? 0,
        kindBreakdown,
      },
      revenueAttributed: platformStats?.revenueAttributed ?? '0',
      conversions: platformStats?.conversions ?? 0,
      queueHealth,
      topMerchants: topMerchantsRows,
      systemHealth: {
        status:
          failedSum > 0 || recentErrors.length > 5 ? 'degraded' : 'healthy',
        errorCount24h: recentErrors.length,
      },
      dailyPerformance: dailyPerfRows,
      recentErrors,
    };

    await this.redis.set(
      ADMIN_OVERVIEW_CACHE_KEY,
      overview,
      ADMIN_OVERVIEW_TTL_SECONDS,
    );
    return overview;
  }

  async listMerchants(): Promise<AdminMerchantRow[]> {
    const rows = await this.db
      .select({
        merchantId: merchants.merchantId,
        storeName: merchants.storeName,
        storeEmail: merchants.storeEmail,
        storeDomain: merchants.storeDomain,
        avatar: merchants.avatar,
        uninstalledAt: merchants.uninstalledAt,
        isActive: merchants.isActive,
        createdAt: merchants.createdAt,
        updatedAt: merchants.updatedAt,
        offerTotal: sql<number>`coalesce((
          select count(*)::int from ${offers}
          where ${offers.merchantId} = ${merchants.merchantId}
        ), 0)`,
        offerActive: sql<number>`coalesce((
          select count(*)::int from ${offers}
          where ${offers.merchantId} = ${merchants.merchantId}
            and ${offers.status} = 'active'
        ), 0)`,
      })
      .from(merchants)
      .orderBy(desc(merchants.createdAt));

    return rows.map((row) => ({
      merchantId: row.merchantId,
      storeName: row.storeName,
      storeEmail: row.storeEmail,
      storeDomain: row.storeDomain,
      avatar: row.avatar,
      uninstalledAt: row.uninstalledAt,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      offerCounts: {
        total: row.offerTotal,
        active: row.offerActive,
      },
    }));
  }

  async getMerchantDetail(
    merchantId: number,
  ): Promise<AdminMerchantDetail | null> {
    const [row] = await this.db
      .select({
        merchantId: merchants.merchantId,
        storeName: merchants.storeName,
        storeEmail: merchants.storeEmail,
        storeDomain: merchants.storeDomain,
        avatar: merchants.avatar,
        uninstalledAt: merchants.uninstalledAt,
        isActive: merchants.isActive,
        createdAt: merchants.createdAt,
        updatedAt: merchants.updatedAt,
        offerTotal: sql<number>`coalesce((
          select count(*)::int from ${offers}
          where ${offers.merchantId} = ${merchants.merchantId}
        ), 0)`,
        offerActive: sql<number>`coalesce((
          select count(*)::int from ${offers}
          where ${offers.merchantId} = ${merchants.merchantId}
            and ${offers.status} = 'active'
        ), 0)`,
      })
      .from(merchants)
      .where(eq(merchants.merchantId, merchantId))
      .limit(1);

    if (!row) return null;

    const health = await this.merchantHealthService.getMerchantHealth(
      merchantId,
    );

    return {
      merchantId: row.merchantId,
      storeName: row.storeName,
      storeEmail: row.storeEmail,
      storeDomain: row.storeDomain,
      avatar: row.avatar,
      uninstalledAt: row.uninstalledAt,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      offerCounts: {
        total: row.offerTotal,
        active: row.offerActive,
      },
      tokenStatus: health?.tokenStatus ?? 'missing',
      lastWebhookAt: health?.lastWebhookAt ?? null,
      stats: health?.stats ?? {
        impressions: 0,
        clicks: 0,
        addToCart: 0,
        conversions: 0,
        conversionsAttributed: 0,
        revenueGenerated: 0,
        revenueAttributed: 0,
      },
    };
  }
}
