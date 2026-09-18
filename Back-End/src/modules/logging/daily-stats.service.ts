import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import {
  activityLogs,
  dailyStats,
} from '../../database/entities/activity-logs';
import { RedisService } from '../../redis/redis.service';
import type { DailyStatPoint } from './types/activity.types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;

const STOREFRONT_ACTION_FIELD = {
  'offer.click': 'clicks',
  'offer.add_to_cart': 'addToCart',
  'offer.conversion': 'conversions',
} as const;

const BACKFILL_LOCK = 'lock:daily-stats:backfill';

@Injectable()
export class DailyStatsService implements OnModuleInit {
  private readonly logger = new Logger(DailyStatsService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async onModuleInit(): Promise<void> {
    const acquired = await this.redis.setNx(BACKFILL_LOCK, '1', 60 * 60);
    if (!acquired) return;
    try {
      const rows = await this.backfillFromActivityLogs();
      this.logger.log(`Daily stats backfill wrote ${rows} merchant-day rows`);
    } catch (error) {
      this.logger.error('Daily stats backfill failed', error);
    }
  }

  async getLast30Days(merchantId: number): Promise<DailyStatPoint[]> {
    const { start, end, days } = this.window();
    const rows = await this.db
      .select({
        date: dailyStats.date,
        impressions: dailyStats.impressions,
        clicks: dailyStats.clicks,
        addToCart: dailyStats.addToCart,
        conversions: dailyStats.conversions,
      })
      .from(dailyStats)
      .where(
        and(
          eq(dailyStats.merchantId, merchantId),
          gte(dailyStats.date, start),
          lte(dailyStats.date, end),
        ),
      );

    const byDate = new Map(rows.map((row) => [row.date, row]));
    return days.map((date) => {
      const row = byDate.get(date);
      return {
        date,
        impressions: row?.impressions ?? 0,
        clicks: row?.clicks ?? 0,
        addToCart: row?.addToCart ?? 0,
        conversions: row?.conversions ?? 0,
      };
    });
  }

  async backfillFromActivityLogs(): Promise<number> {
    const { start } = this.window();
    const grouped = await this.db
      .select({
        merchantId: activityLogs.merchantId,
        date: sql<string>`(${activityLogs.createdAt} AT TIME ZONE 'UTC')::date::text`,
        action: activityLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.actorType, 'storefront'),
          gte(activityLogs.createdAt, new Date(`${start}T00:00:00.000Z`)),
          sql`${activityLogs.action} in ('offer.click', 'offer.add_to_cart', 'offer.conversion')`,
        ),
      )
      .groupBy(
        activityLogs.merchantId,
        sql`(${activityLogs.createdAt} AT TIME ZONE 'UTC')::date`,
        activityLogs.action,
      );

    const buckets = new Map<
      string,
      { merchantId: number; date: string } & {
        impressions: number;
        clicks: number;
        addToCart: number;
        conversions: number;
      }
    >();

    for (const row of grouped) {
      if (row.merchantId == null) continue;
      const field =
        STOREFRONT_ACTION_FIELD[
          row.action as keyof typeof STOREFRONT_ACTION_FIELD
        ];
      if (!field) continue;
      const key = `${row.merchantId}:${row.date}`;
      const bucket = buckets.get(key) ?? {
        merchantId: row.merchantId,
        date: row.date,
        impressions: 0,
        clicks: 0,
        addToCart: 0,
        conversions: 0,
      };
      bucket[field] += row.count;
      buckets.set(key, bucket);
    }

    for (const bucket of buckets.values()) {
      await this.db
        .insert(dailyStats)
        .values(bucket)
        .onConflictDoUpdate({
          target: [dailyStats.merchantId, dailyStats.date],
          set: {
            clicks: sql`greatest(${dailyStats.clicks}, ${bucket.clicks})`,
            addToCart: sql`greatest(${dailyStats.addToCart}, ${bucket.addToCart})`,
            conversions: sql`greatest(${dailyStats.conversions}, ${bucket.conversions})`,
            updatedAt: new Date(),
          },
        });
    }

    return buckets.size;
  }

  private window(days = WINDOW_DAYS) {
    const today = new Date();
    const endDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const startDate = new Date(endDate.getTime() - (days - 1) * DAY_MS);
    const list: string[] = [];
    for (let i = 0; i < days; i += 1) {
      list.push(
        new Date(startDate.getTime() + i * DAY_MS).toISOString().slice(0, 10),
      );
    }
    return {
      start: list[0],
      end: list[list.length - 1],
      days: list,
    };
  }
}
