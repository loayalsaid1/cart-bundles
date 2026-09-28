import { Injectable } from '@nestjs/common';
import { ActivityService } from '../activity-log/activity/activity.service';
import { OfferIndexCacheService } from '../conversion-attribution/conversion/offer-index-cache.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class OfferSideEffectsService {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly activityService: ActivityService,
    private readonly offerIndexCache: OfferIndexCacheService,
  ) {}

  async afterWrite(
    merchantId: number,
    offerId: number,
    action:
      | 'offer.created'
      | 'offer.updated'
      | 'offer.deleted'
      | 'offer.status_changed',
    extra?: Record<string, unknown>,
  ): Promise<void> {
    // Invalidate the storefront offer cache and the order-matching index in parallel.
    // The index is rebuilt lazily on the next order event.
    this.invalidateCaches(merchantId)

    await this.activityService.enqueue({
      merchantId,
      actorType: 'merchant',
      action,
      entityType: 'offer',
      entityId: offerId,
      offerId: action === 'offer.deleted' ? null : offerId,
      metadata: extra,
    });
  }

  async afterSallaSyncFailed(
    merchantId: number,
    offerId: number,
    error: string,
  ): Promise<void> {
    await this.activityService.enqueue({
      merchantId,
      actorType: 'system',
      action: 'offer.salla_sync_failed',
      entityType: 'offer',
      entityId: offerId,
      offerId,
      severity: 'error',
      message: error,
    });
  }

  async invalidateCaches(merchantId: number): Promise<void> {
    await Promise.all([
      this.merchantsService.invalidateStorefrontCache(merchantId),
      this.offerIndexCache.invalidate(merchantId),
    ]);
  }
}
