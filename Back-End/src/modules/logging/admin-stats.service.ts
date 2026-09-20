import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { eventLogs } from '../../database/entities/event-logs';
import { activityLogs, dailyStats } from '../../database/entities/activity-logs';
import { merchants } from '../../database/entities/merchants';
import { offers } from '../../database/entities/offers';
import { RedisService } from '../../redis/redis.service';
import type { AdminMerchantRow, AdminOverview } from './types/activity.types';

const ADMIN_OVERVIEW_CACHE_KEY = 'admin:overview';
const ADMIN_OVERVIEW_TTL_SECONDS = 60;

@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async getAdminOverview(): Promise<AdminOverview> {
    const cached = await this.redis.get<AdminOverview>(
      ADMIN_OVERVIEW_CACHE_KEY,
    );
    if (cached) return cached;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fourteenDaysAgoStr = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [
      merchantRows,
      offerRows,
      kindBreakdownRows,
      zeroOffersRows,
      webhookRows,
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
          count: sql<number>`count(*)::int`,
        })
        .from(eventLogs)
        .where(gte(eventLogs.eventDate, since24h)),

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
    const webhookRow = webhookRows[0];
    const zeroOffersCount = zeroOffersRows[0]?.count ?? 0;

    const kindBreakdown: Record<string, number> = {};
    for (const r of kindBreakdownRows) {
      if (r.kind) {
        kindBreakdown[r.kind] = r.count;
      }
    }

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
      webhooksLast24h: webhookRow?.count ?? 0,
      systemHealth: {
        status: recentErrors.length > 5 ? 'degraded' : 'healthy',
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
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      offerCounts: {
        total: row.offerTotal,
        active: row.offerActive,
      },
    }));
  }
}
