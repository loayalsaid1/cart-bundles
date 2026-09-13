import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUES } from '../../redis/redis.constants';
import { ActivityService } from './activity.service';
import type { StorefrontEventName } from './activity.types';

export interface StorefrontEventJob {
  merchantId: number;
  offerId: number;
  event: StorefrontEventName;
  productId?: number;
  source?: string;
}

@Processor(QUEUES.STOREFRONT)
export class StorefrontEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(StorefrontEventsProcessor.name);

  constructor(private readonly activityService: ActivityService) {
    super();
  }

  async process(job: Job<StorefrontEventJob>): Promise<void> {
    const payload = job.data;
    const fieldMap: Record<
      StorefrontEventName,
      'impressions' | 'clicks' | 'addToCart' | 'conversions'
    > = {
      'offer.impression': 'impressions',
      'offer.click': 'clicks',
      'offer.add_to_cart': 'addToCart',
      'offer.conversion': 'conversions',
    };

    const field = fieldMap[payload.event];
    if (!field) {
      this.logger.warn(`Unknown storefront event ${payload.event}`);
      return;
    }

    await this.activityService.incrementOfferStat(
      payload.offerId,
      payload.merchantId,
      field,
    );

    if (payload.event !== 'offer.impression') {
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
}
