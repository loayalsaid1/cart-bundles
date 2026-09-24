import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { lt } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { activityLogs } from '../../../database/entities/activity-logs';
import { eventLogs } from '../../../database/entities/event-logs';

const RETENTION_DAYS = 30;

@Injectable()
export class LogRetentionService {
  private readonly logger = new Logger(LogRetentionService.name);

  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredLogs(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const [activities, events] = await Promise.all([
      this.db
        .delete(activityLogs)
        .where(lt(activityLogs.createdAt, cutoff))
        .returning({ id: activityLogs.id }),
      this.db
        .delete(eventLogs)
        .where(lt(eventLogs.eventDate, cutoff))
        .returning({ id: eventLogs.id }),
    ]);

    this.logger.log(
      `Retention: purged ${activities.length} activity logs and ${events.length} event logs older than ${RETENTION_DAYS} days`,
    );
  }
}
