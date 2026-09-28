import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../database/drizzle.module';
import { LogRetentionService } from './log-retention.service';

/**
 * Nightly cron that purges activity_logs / event_logs past the retention
 * window. No consumers depend on it and it depends on nothing but the
 * database, so it's the simplest possible standalone module.
 */
@Module({
  imports: [DrizzleModule],
  providers: [LogRetentionService],
})
export class RetentionModule {}
