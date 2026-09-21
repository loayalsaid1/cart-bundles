import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.constants';

export interface QueueFailedCounts {
  webhooksFailed: number;
  activityFailed: number;
  storefrontFailed: number;
}

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name);

  constructor(
    @InjectQueue(QUEUES.WEBHOOKS) private readonly webhooksQueue: Queue,
    @InjectQueue(QUEUES.ACTIVITY) private readonly activityQueue: Queue,
    @InjectQueue(QUEUES.STOREFRONT) private readonly storefrontQueue: Queue,
  ) {}

  async getFailedCounts(): Promise<QueueFailedCounts> {
    const [webhooksFailed, activityFailed, storefrontFailed] =
      await Promise.all([
        this.getQueueFailedCount(this.webhooksQueue, 'webhooks'),
        this.getQueueFailedCount(this.activityQueue, 'activity'),
        this.getQueueFailedCount(this.storefrontQueue, 'storefront'),
      ]);

    return {
      webhooksFailed,
      activityFailed,
      storefrontFailed,
    };
  }

  private async getQueueFailedCount(
    queue: Queue,
    name: string,
  ): Promise<number> {
    try {
      const counts = await queue.getJobCounts('failed');
      return counts.failed ?? 0;
    } catch (error) {
      this.logger.error(`Failed to get job counts for queue ${name}`, error);
      return 0;
    }
  }
}
