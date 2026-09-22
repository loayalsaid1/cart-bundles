import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../../queue/queue.constants';
import { ActivityService } from './activity.service';
import type { RecordActivityInput } from '../types/activity.types';

@Processor(QUEUES.ACTIVITY)
export class ActivityProcessor extends WorkerHost {
  private readonly logger = new Logger(ActivityProcessor.name);

  constructor(private readonly activityService: ActivityService) {
    super();
  }

  async process(job: Job<RecordActivityInput>): Promise<void> {
    try {
      await this.activityService.record(job.data);
    } catch (error) {
      this.logger.error(`Failed processing activity job ${job.id}`, error);
      throw error;
    }
  }
}
