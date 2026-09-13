import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { redactJson } from '../../common/utils/redact';
import { DEFAULT_JOB_OPTIONS, QUEUES } from '../../redis/redis.constants';
import type { SallaAppEventBase } from './types/salla-events';

@Injectable()
export class WebhookQueueService {
  constructor(
    @InjectQueue(QUEUES.WEBHOOKS)
    private readonly queue: Queue<SallaAppEventBase>,
  ) {}

  async enqueue(payload: SallaAppEventBase): Promise<void> {
    await this.queue.add(
      payload.event,
      redactJson(payload) as unknown as SallaAppEventBase,
      {
        ...DEFAULT_JOB_OPTIONS,
        jobId: `${payload.event}:${payload.merchant}:${payload.created_at ?? Date.now()}`,
      },
    );
  }
}
