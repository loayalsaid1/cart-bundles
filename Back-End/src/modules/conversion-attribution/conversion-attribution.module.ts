import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CatalogCacheService } from './conversion/catalog-cache.service';
import { ConversionAttributor } from './conversion/matchers/conversion-attributor';
import { OfferIndexCacheService } from './conversion/offer-index-cache.service';
import { OrderConversionService } from './conversion/order-conversion.service';

/**
 * Owns matching an incoming order.* webhook to the offers that produced it:
 * the inverted per-merchant offer index (OfferIndexCacheService), the
 * category → product lookup cache (CatalogCacheService), the pure matching
 * logic (ConversionAttributor + matchers/*), and the orchestrating service
 * (OrderConversionService) that ties them together and records the result.
 *
 * Depends on ActivityLogModule (audit row per matched conversion) and
 * AnalyticsModule (buffering the resulting stat deltas) — both are leaves,
 * so this stays a one-way dependency with no cycles.
 */
@Module({
  imports: [DrizzleModule, MerchantsModule, ActivityLogModule, AnalyticsModule],
  providers: [
    CatalogCacheService,
    ConversionAttributor,
    OfferIndexCacheService,
    OrderConversionService,
  ],
  exports: [
    CatalogCacheService,
    ConversionAttributor,
    OfferIndexCacheService,
    OrderConversionService,
  ],
})
export class ConversionAttributionModule {}
