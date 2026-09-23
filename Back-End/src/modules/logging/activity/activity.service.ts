import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq, ilike, or, SQL, sql } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import { activityLogs } from '../../../database/entities/activity-logs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { redactJson } from '../../../common/utils/redact';
import { QUEUES } from '../../../queue/queue.constants';
import type {
  ActivityListQuery,
  RecordActivityInput,
} from '../types/activity.types';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    @InjectQueue(QUEUES.ACTIVITY)
    private readonly activityQueue: Queue<RecordActivityInput>,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async enqueue(input: RecordActivityInput): Promise<void> {
    try {
      await this.activityQueue.add(input.action, input);
    } catch (error) {
      this.logger.error('Failed to enqueue activity, writing inline', error);
      await this.record(input);
    }
  }

  async record(input: RecordActivityInput): Promise<void> {
    try {
      await this.db.insert(activityLogs).values({
        merchantId: input.merchantId ?? null,
        actorType: input.actorType,
        actorId: input.actorId != null ? String(input.actorId) : null,
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId != null ? String(input.entityId) : null,
        offerId: input.offerId ?? null,
        severity: input.severity ?? 'info',
        message: input.message ?? null,
        metadata: redactJson(input.metadata ?? {}),
      });
    } catch (error) {
      this.logger.error('Failed to persist activity log', error);
    }
  }

  async list(query: ActivityListQuery) {
    const conditions: SQL[] = [];
    if (query.merchantId) {
      conditions.push(eq(activityLogs.merchantId, query.merchantId));
    }
    if (query.actorType) {
      conditions.push(eq(activityLogs.actorType, query.actorType));
    }
    if (query.action) {
      conditions.push(eq(activityLogs.action, query.action));
    }
    if (query.severity) {
      conditions.push(eq(activityLogs.severity, query.severity));
    }
    if (query.offerId) {
      conditions.push(eq(activityLogs.offerId, query.offerId));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(activityLogs.action, term),
          ilike(activityLogs.message, term),
        )!,
      );
    }
    if (query.excludeStorefront) {
      conditions.push(sql`${activityLogs.actorType} <> 'storefront'`);
    }

    const limit = Math.min(query.limit ?? 50, 200);
    const offset = Math.max(query.offset ?? 0, 0);
    const whereClause = conditions.length ? and(...conditions) : undefined;

    // Limit + 1 pattern: fetch limit + 1 items to determine hasMore without expensive COUNT(*)
    const rows = await this.db
      .select()
      .from(activityLogs)
      .where(whereClause)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return { items, hasMore };
  }
}
