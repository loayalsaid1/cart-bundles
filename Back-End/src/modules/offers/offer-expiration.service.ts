import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, lte } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { offers } from '../../database/entities/offers';
import { RedisService } from '../../redis/redis.service';
import { ActivityService } from '../activity-log/activity/activity.service';
import { OfferSideEffectsService } from './offer-side-effects.service';

const OFFER_EXPIRATION_LOCK = 'lock:offers:expiration';
const OFFER_EXPIRATION_LOCK_TTL_SECONDS = 10 * 60;

@Injectable()
export class OfferExpirationService {
  private readonly logger = new Logger(OfferExpirationService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
    private readonly sideEffects: OfferSideEffectsService,
    private readonly activityService: ActivityService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  @Cron('1 0 * * *', { timeZone: 'Asia/Riyadh' })
  async expireOffers(): Promise<void> {
    const lockAcquired = await this.redis.setNx(
      OFFER_EXPIRATION_LOCK,
      new Date().toISOString(),
      OFFER_EXPIRATION_LOCK_TTL_SECONDS,
    );
    if (!lockAcquired) return;

    const now = new Date();
    try {
      const expiredOffers = await this.db
        .update(offers)
        .set({ status: 'expired' })
        .where(and(eq(offers.status, 'active'), lte(offers.expiryDate, now)))
        .returning({ id: offers.id, merchantId: offers.merchantId });

      const offerIdsByMerchant = new Map<number, number[]>();
      for (const offer of expiredOffers) {
        const offerIds = offerIdsByMerchant.get(offer.merchantId) ?? [];
        offerIds.push(offer.id);
        offerIdsByMerchant.set(offer.merchantId, offerIds);
      }

      await Promise.all(
        [...offerIdsByMerchant.entries()].map(
          async ([merchantId, offerIds]) => {
            await Promise.all([
              this.sideEffects.invalidateCaches(merchantId),
              ...offerIds.map((offerId) =>
                this.activityService.enqueue({
                  merchantId,
                  actorType: 'system',
                  action: 'offer.expired',
                  entityType: 'offer',
                  entityId: offerId,
                  offerId,
                  metadata: { expiredAt: now.toISOString() },
                }),
              ),
            ]);
          },
        ),
      );

      this.logger.log(`Expired ${expiredOffers.length} offers`);
    } catch (error) {
      this.logger.error('Failed to expire offers', error);
    }
  }
}
