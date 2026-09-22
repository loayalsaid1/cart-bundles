import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { QUEUES } from '../../queue/queue.constants';
import { MerchantsModule } from '../merchants/merchants.module';

import { ActivityController } from './activity/activity.controller';
import { ActivityProcessor } from './activity/activity.processor';
import { ActivityService } from './activity/activity.service';
import { AdminActivityController } from './activity/admin-activity.controller';

import { AdminStatsService } from './stats/admin-stats.service';
import { DailyStatsService } from './stats/daily-stats.service';
import { MerchantHealthService } from './stats/merchant-health.service';
import { OfferStatsService } from './stats/offer-stats.service';

import { CatalogCacheService } from './conversion/catalog-cache.service';
import { ConversionAttributor } from './conversion/matchers/conversion-attributor';
import { OfferIndexCacheService } from './conversion/offer-index-cache.service';
import { OrderConversionService } from './conversion/order-conversion.service';

import { StorefrontEventsController } from './storefront/storefront-events.controller';
import { StorefrontEventsProcessor } from './storefront/storefront-events.processor';

import { LogRetentionService } from './retention/log-retention.service';

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
