import { Injectable } from '@nestjs/common';
import { ActivityService } from '../logging/activity.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class OfferSideEffectsService {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly activityService: ActivityService,
  ) {}

  async afterWrite(
    merchantId: number,
    offerId: number,
    action: 'offer.created' | 'offer.updated' | 'offer.deleted',
    extra?: Record<string, unknown>,
  ): Promise<void> {
    await this.merchantsService.invalidateStorefrontCache(merchantId);
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
}
