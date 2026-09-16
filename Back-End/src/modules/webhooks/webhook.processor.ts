import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../queue/queue.constants';
import { ActivityService } from '../logging/activity.service';
import { EventLoggerService } from './event-logger.service';
import { INLINE_WEBHOOK_EVENTS } from './inline-events';
import type { SallaAppEventBase } from './types/salla-events';
import { WebhooksService } from './webhooks.service';

@Processor(QUEUES.WEBHOOKS)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly eventLoggerService: EventLoggerService,
    private readonly activityService: ActivityService,
  ) {
    super();
  }

  async process(job: Job<SallaAppEventBase>): Promise<void> {
    const data = job.data;
    try {
      await this.eventLoggerService.logEvent(data);
      if (!INLINE_WEBHOOK_EVENTS.has(data.event)) {
        await this.webhooksService.processEvent(data);
      }
      await this.activityService.record({
        merchantId: data.merchant,
        actorType: 'salla',
        action: data.event,
        entityType: 'webhook',
        severity: 'info',
        metadata: { createdAt: data.created_at },
      });
    } catch (error) {
      this.logger.error(`Failed processing webhook job ${job.id}`, error);
      throw error;
    }
  }
}
