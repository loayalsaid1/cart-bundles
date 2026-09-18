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

@Module({
  imports: [
    DrizzleModule,
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
  ],
  exports: [
    ActivityService,
    OfferStatsService,
    MerchantHealthService,
    AdminStatsService,
    DailyStatsService,
  ],
})
export class LoggingModule {}
