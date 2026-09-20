import { Injectable, Logger } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { offers } from '../../database/entities/offers';
import { RedisService } from '../../redis/redis.service';
import { ActivityService } from './activity.service';
import { OfferStatsService } from './offer-stats.service';
import type { SallaOrderWebhookEvent } from '../webhooks/types/salla-events';
import {
  conversionLockKey,
  extractOrderId,
  extractOrderStatus,
  extractProductQuantities,
  matchOffers,
  TERMINAL_ORDER_STATUSES,
} from './utils/order-conversion.matcher';

const CONVERSION_TTL_SECONDS = 60 * 60 * 24 * 30;

@Injectable()
export class OrderConversionService {
  private readonly logger = new Logger(OrderConversionService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
    private readonly offerStats: OfferStatsService,
    private readonly activityService: ActivityService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async handleOrderEvent(event: SallaOrderWebhookEvent): Promise<void> {
    const orderId = extractOrderId(event.data);
    if (!orderId) {
      this.logger.warn(
        `Order webhook ${event.event} for merchant ${event.merchant} missing order id`,
      );
      return;
    }

    const status = extractOrderStatus(event.data);
    if (status && TERMINAL_ORDER_STATUSES.has(status)) return;

    const quantities = extractProductQuantities(event.data);
    if (quantities.size === 0) return;

    const offerIds = matchOffers(
      await this.loadActiveOffers(event.merchant),
      quantities,
    );

    for (const offerId of offerIds) {
      await this.recordConversion(event.merchant, orderId, offerId);
    }
  }

  async loadActiveOffers(merchantId: number) {
    return this.db.query.offers.findMany({
      where: and(
        eq(offers.merchantId, merchantId),
        eq(offers.status, 'active'),
      ),
      with: {
        targets: true,
        relatedProducts: true,
        quantityTiers: true,
        upgradeSettings: true,
        recommendationSettings: true,
      },
    });
  }

  private async recordConversion(
    merchantId: number,
    orderId: number,
    offerId: number,
  ): Promise<void> {
    const acquired = await this.redis.setNx(
      conversionLockKey(merchantId, orderId, offerId),
      '1',
      CONVERSION_TTL_SECONDS,
    );
    if (!acquired) return;

    await this.offerStats.buffer(merchantId, offerId, 'conversions');
    await this.activityService.record({
      merchantId,
      actorType: 'salla',
      action: 'offer.conversion',
      entityType: 'order',
      entityId: orderId,
      offerId,
      metadata: { sallaOrderId: orderId },
    });
  }
}
