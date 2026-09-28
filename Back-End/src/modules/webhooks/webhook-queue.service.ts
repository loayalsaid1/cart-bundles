import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { redactJson } from '../../common/utils/redact';
import { QUEUES } from '../../queue/queue.constants';
import type { SallaAppEventBase } from './types/salla-events';

@Injectable()
export class WebhookQueueService {
  constructor(
    @InjectQueue(QUEUES.WEBHOOKS)
    private readonly queue: Queue<SallaAppEventBase>,
  ) {}

  async enqueue(payload: SallaAppEventBase): Promise<void> {
    // Dedupe only when we have Salla's own timestamp. A Date.now() fallback
    // would mint a unique id on every retry and silently defeat the dedupe.
    const jobId = payload.created_at
      ? encodeURIComponent(
          `${payload.event}:${payload.merchant}:${payload.created_at}`,
        )
      : undefined;

    await this.queue.add(
      payload.event,
      redactJson(payload) as unknown as SallaAppEventBase,
      { jobId },
    );
  }
}
