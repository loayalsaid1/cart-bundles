import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { QUEUES } from '../../redis/redis.constants';
import { ActivityController } from './activity.controller';
import { ActivityProcessor } from './activity.processor';
import { ActivityService } from './activity.service';
import { AdminActivityController } from './admin-activity.controller';
import { StorefrontEventsController } from './storefront-events.controller';
import { StorefrontEventsProcessor } from './storefront-events.processor';

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
  providers: [ActivityService, ActivityProcessor, StorefrontEventsProcessor],
  exports: [ActivityService],
})
export class LoggingModule {}
