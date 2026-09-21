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
  extractProductAmounts,
  matchOffers,
  TERMINAL_ORDER_STATUSES,
} from './utils/order-conversion.matcher';
import { calculateExtraRevenue } from './utils/conversion-revenue';
import {
  ConversionAttributor,
  isWidgetSource,
} from './utils/conversion-attributor';

const CONVERSION_TTL_SECONDS = 60 * 60 * 24 * 30;

@Injectable()
export class OrderConversionService {
  private readonly logger = new Logger(OrderConversionService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
    private readonly offerStats: OfferStatsService,
    private readonly activityService: ActivityService,
    private readonly attributor: ConversionAttributor,
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

    const amounts = extractProductAmounts(event.data);
    const activeOffers = await this.loadActiveOffers(event.merchant);
    const matchedOffers = activeOffers.filter((offer) =>
      matchOffers([offer], quantities).includes(offer.id),
    );

    const productIds = new Set(quantities.keys());
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const offer of matchedOffers) {
      const revenue = calculateExtraRevenue(
        offer,
        amounts,
        productIds,
        quantities,
      );

      const hasSignal = await this.attributor.hasWidgetSignal({
        merchantId: event.merchant,
        offerId: offer.id,
        since: sevenDaysAgo,
      });

      const source = isWidgetSource(hasSignal);
      const attributedRevenue = source === 'widget' ? revenue : 0;

      await this.recordConversion(
        event.merchant,
        orderId,
        offer.id,
        revenue,
        attributedRevenue,
        source,
      );
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
    revenue: number,
    attributedRevenue: number,
    source: 'widget' | 'inferred',
  ): Promise<void> {
    const acquired = await this.redis.setNx(
      conversionLockKey(merchantId, orderId, offerId),
      '1',
      CONVERSION_TTL_SECONDS,
    );
    if (!acquired) return;

    await this.offerStats.buffer(merchantId, offerId, 'conversions');
    if (source === 'widget') {
      await this.offerStats.buffer(
        merchantId,
        offerId,
        'conversionsAttributed',
      );
    }
    await this.offerStats.bufferRevenue(
      merchantId,
      offerId,
      revenue,
      attributedRevenue,
    );

    await this.activityService.record({
      merchantId,
      actorType: 'salla',
      action: 'offer.conversion',
      entityType: 'order',
      entityId: orderId,
      offerId,
      metadata: {
        sallaOrderId: orderId,
        source,
        revenue,
        attributedRevenue,
      },
    });
  }
}
