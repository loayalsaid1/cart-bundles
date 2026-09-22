import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { QUEUES } from '../../queue/queue.constants';
import { ActivityController } from './activity.controller';
import { ActivityProcessor } from './activity.processor';
import { ActivityService } from './activity.service';
import { AdminActivityController } from './admin-activity.controller';
import { LogRetentionService } from './log-retention.service';
import { OfferStatsService } from './offer-stats.service';
import { StorefrontEventsController } from './storefront-events.controller';
import { StorefrontEventsProcessor } from './storefront-events.processor';

import { MerchantHealthService } from './merchant-health.service';
import { AdminStatsService } from './admin-stats.service';
import { DailyStatsService } from './daily-stats.service';
import { OrderConversionService } from './order-conversion.service';
import { ConversionAttributor } from './utils/conversion-attributor';
import { OfferIndexCacheService } from './offer-index-cache.service';
import { CatalogCacheService } from './catalog-cache.service';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    DrizzleModule,
    MerchantsModule,
    BullModule.registerQueue(
      { name: QUEUES.ACTIVITY },
      { name: QUEUES.STOREFRONT },
    ),
  ],
  controllers: [
    ActivityController,
    AdminActivityController,
    StorefrontEventsController,
  ],
  providers: [
    ActivityService,
    ActivityProcessor,
    StorefrontEventsProcessor,
    OfferStatsService,
    LogRetentionService,
    MerchantHealthService,
    AdminStatsService,
    DailyStatsService,
    OrderConversionService,
    ConversionAttributor,
    OfferIndexCacheService,
    CatalogCacheService,
  ],
  exports: [
    ActivityService,
    OfferStatsService,
    MerchantHealthService,
    AdminStatsService,
    DailyStatsService,
    OrderConversionService,
    ConversionAttributor,
    OfferIndexCacheService,
    CatalogCacheService,
  ],
})
export class LoggingModule {}
