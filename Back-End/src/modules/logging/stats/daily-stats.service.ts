import { Injectable } from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { dailyStats } from '../../../database/entities/activity-logs';
import type { DailyStatPoint } from '../types/stats.types';
import { getDateWindow } from './date-window.util';

/**
 * Read-only query service for merchant daily activity statistics.
 */
@Injectable()
export class DailyStatsService {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  async getLast30Days(merchantId: number): Promise<DailyStatPoint[]> {
    const { start, end, days } = getDateWindow(30);
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
}
