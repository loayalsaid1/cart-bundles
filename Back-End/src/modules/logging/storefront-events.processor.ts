import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../queue/queue.constants';
import { ActivityService } from './activity.service';
import { OfferStatsService } from './offer-stats.service';
import {
  STOREFRONT_EVENT_FIELD,
  type StorefrontEventJob,
} from './types/activity.types';

@Processor(QUEUES.STOREFRONT)
export class StorefrontEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(StorefrontEventsProcessor.name);

  constructor(
    private readonly activityService: ActivityService,
    private readonly offerStats: OfferStatsService,
  ) {
    super();
  }

  async process(job: Job<StorefrontEventJob>): Promise<void> {
    const payload = job.data;
    const field = STOREFRONT_EVENT_FIELD[payload.event];
    if (!field) {
      this.logger.warn(`Unknown storefront event ${payload.event}`);
      return;
    }

    // Counters are buffered in Redis and flushed in bulk; only non-impression
    // events also produce an audit row (impressions are far too frequent).
    await this.offerStats.buffer(payload.merchantId, payload.offerId, field);

    if (payload.event === 'offer.impression') return;

    // Never write an audit row for an offer the merchant does not own; this
    // also guards the offer_id foreign key against unknown ids.
    const owned = await this.offerStats.isOfferOwned(
      payload.merchantId,
      payload.offerId,
    );
    if (!owned) {
      this.logger.warn(
        `Dropped ${payload.event} for offer ${payload.offerId}: not owned by merchant ${payload.merchantId}`,
      );
      return;
    }

    await this.activityService.record({
      merchantId: payload.merchantId,
      actorType: 'storefront',
      action: payload.event,
      entityType: 'offer',
      entityId: payload.offerId,
      offerId: payload.offerId,
      metadata: {
        productId: payload.productId,
        source: payload.source,
      },
    });
  }
}
