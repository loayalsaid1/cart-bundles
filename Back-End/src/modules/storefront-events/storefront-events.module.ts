import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUES } from '../../queue/queue.constants';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StorefrontEventsController } from './storefront/storefront-events.controller';
import { StorefrontEventsProcessor } from './storefront/storefront-events.processor';

/**
 * Public, rate-limited ingestion endpoint for widget telemetry
 * (impression/click/add-to-cart) plus the queue worker that buffers the
 * counters into AnalyticsModule and writes an audit row via
 * ActivityLogModule for everything except impressions.
 */
@Module({
  imports: [
    ActivityLogModule,
    AnalyticsModule,
    BullModule.registerQueue({ name: QUEUES.STOREFRONT }),
  ],
  controllers: [StorefrontEventsController],
  providers: [StorefrontEventsProcessor],
})
export class StorefrontEventsModule {}
