import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { QUEUES } from '../../queue/queue.constants';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ActivityController } from './activity/activity.controller';
import { ActivityProcessor } from './activity/activity.processor';
import { ActivityService } from './activity/activity.service';
import { AdminActivityController } from './activity/admin-activity.controller';

/**
 * Owns the append-only audit trail (activityLogs table) and its queue-backed
 * writer. ActivityController and AdminActivityController also surface the
 * daily/health/admin-overview views, so this module imports AnalyticsModule
 * rather than duplicating those reads.
 */
@Module({
  imports: [
    DrizzleModule,
    AnalyticsModule,
    BullModule.registerQueue({ name: QUEUES.ACTIVITY }),
  ],
  controllers: [ActivityController, AdminActivityController],
  providers: [ActivityService, ActivityProcessor],
  exports: [ActivityService],
})
export class ActivityLogModule {}
