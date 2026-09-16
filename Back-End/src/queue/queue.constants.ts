import type { JobsOptions } from 'bullmq';

export const QUEUES = {
  WEBHOOKS: 'salla-webhooks',
  ACTIVITY: 'app-activity',
  STOREFRONT: 'storefront-events',
} as const;

/**
 * Applied once at `BullModule.forRootAsync` (registered in QueueModule).
 * Per-add calls should only override `jobId` when they need dedupe.
 */
export const DEFAULT_JOB_OPTIONS: Partial<JobsOptions> = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 2_000 },
};
