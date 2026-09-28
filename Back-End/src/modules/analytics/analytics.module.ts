import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { AdminStatsService } from './stats/admin-stats.service';
import { DailyStatsService } from './stats/daily-stats.service';
import { MerchantHealthService } from './stats/merchant-health.service';
import { OfferStatsService } from './stats/offer-stats.service';

/**
 * Owns all read-side aggregation: per-offer/per-merchant counters buffered
 * in Redis and flushed to Postgres (OfferStatsService), the merchant-facing
 * daily trend line (DailyStatsService), the admin dashboard rollups
 * (AdminStatsService), and the merchant health snapshot (MerchantHealthService).
 *
 * Deliberately has no dependency on ActivityLogModule or
 * ConversionAttributionModule — this is the leaf of the analytics dependency
 * graph so it can be imported anywhere without pulling in queues or matchers.
 */
@Module({
  imports: [DrizzleModule],
  providers: [
    OfferStatsService,
    AdminStatsService,
    DailyStatsService,
    MerchantHealthService,
  ],
  exports: [
    OfferStatsService,
    AdminStatsService,
    DailyStatsService,
    MerchantHealthService,
  ],
})
export class AnalyticsModule {}
