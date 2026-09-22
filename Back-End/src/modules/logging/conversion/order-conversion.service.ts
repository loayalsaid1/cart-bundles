import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../../../database/drizzle.service';
import { RedisService } from '../../../redis/redis.service';
import { ActivityService } from '../activity/activity.service';
import { CatalogCacheService } from './catalog-cache.service';
import { OfferIndexCacheService } from './offer-index-cache.service';
import { OfferStatsService } from '../stats/offer-stats.service';
import type { SallaOrderWebhookEvent } from '../../webhooks/types/salla-events';
import {
  conversionLockKey,
  extractOrderId,
  extractOrderStatus,
  extractProductAmounts,
  extractProductQuantities,
  type MatchContext,
  TERMINAL_ORDER_STATUSES,
} from './matchers/order-conversion.matcher';
import { matchOffersFromIndex } from './matchers/offer-match-index';
import { calculateExtraRevenue } from './matchers/conversion-revenue';
import { ConversionAttributor } from './matchers/conversion-attributor';

/** 30-day lock so the same (order, offer) pair is never double-counted. */
const CONVERSION_LOCK_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Attribution window: we look back 7 days for a prior widget interaction. */
const ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class OrderConversionService {
  private readonly logger = new Logger(OrderConversionService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly redis: RedisService,
    private readonly offerStats: OfferStatsService,
    private readonly activityService: ActivityService,
    private readonly attributor: ConversionAttributor,
    private readonly offerIndexCache: OfferIndexCacheService,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async handleOrderEvent(event: SallaOrderWebhookEvent): Promise<void> {
    // ── 1. Basic guards ──────────────────────────────────────────────────
    const orderId = extractOrderId(event.data);
    if (!orderId) {
      this.logger.warn(
        `Order webhook ${event.event} for merchant ${event.merchant} is missing an order id`,
      );
      return;
    }

    const status = extractOrderStatus(event.data);
    if (status && TERMINAL_ORDER_STATUSES.has(status)) return;

    const quantities = extractProductQuantities(event.data);
    if (quantities.size === 0) return;

    const amounts = extractProductAmounts(event.data);

    // ── 2. Get the pre-built inverted index (Redis hit ~95% of the time) ──
    const index = await this.offerIndexCache.getOrBuild(event.merchant);

    // ── 3. Build match context with category expansion ───────────────────
    // Derive the category IDs the merchant's active offers care about directly
    // from the index — we only call Salla for categories that are actually
    // targeted by at least one offer.
    const ctx =
      index.byCategory.size > 0
        ? await this.catalogCache.buildMatchContext(
            event.merchant,
            [...index.byCategory.keys()],
          )
        : { categoryProducts: new Map<number, Set<number>>() };

    // ── 4. Candidate selection + per-offer validation (O(orderSize + candidates)) ──
    const matchedOffers = matchOffersFromIndex(index, quantities, ctx);
    if (matchedOffers.length === 0) return;

    // ── 5. Single attribution query for ALL matched offers ────────────────
    const since = new Date(Date.now() - ATTRIBUTION_WINDOW_MS);
    const attributedOfferIds = await this.attributor.batchHasWidgetSignal({
      merchantId: event.merchant,
      offerIds: matchedOffers.map((o) => o.id),
      since,
    });

    // ── 6. Record influence per matched offer ─────────────────────────────
    const orderProductIds = new Set(quantities.keys());
    for (const offer of matchedOffers) {
      const revenue = calculateExtraRevenue(
        offer,
        amounts,
        orderProductIds,
        quantities,
      );
      const isAttributed = attributedOfferIds.has(offer.id);
      await this.recordInfluence(
        event.merchant,
        orderId,
        offer.id,
        revenue,
        isAttributed,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Private: idempotent influence recording
  // ---------------------------------------------------------------------------

  private async recordInfluence(
    merchantId: number,
    orderId: number,
    offerId: number,
    revenue: number,
    isAttributed: boolean,
  ): Promise<void> {
    // Redis lock prevents the same (order, offer) pair from being counted twice
    // even if the webhook fires multiple times (e.g. order.created + order.updated).
    const acquired = await this.redis.setNx(
      conversionLockKey(merchantId, orderId, offerId),
      '1',
      CONVERSION_LOCK_TTL_SECONDS,
    );
    if (!acquired) return;

    // "conversions" here means "influenced orders" — an order that contained
    // products matching this offer.  "conversionsAttributed" narrows that to
    // orders where a prior widget interaction (click / add_to_cart) was found.
    await this.offerStats.buffer(merchantId, offerId, 'conversions');
    if (isAttributed) {
      await this.offerStats.buffer(merchantId, offerId, 'conversionsAttributed');
    }

    await this.offerStats.bufferRevenue(
      merchantId,
      offerId,
      revenue,
      isAttributed ? revenue : 0,
    );

    await this.activityService.record({
      merchantId,
      actorType: 'salla',
      action: 'offer.influenced_order',
      entityType: 'order',
      entityId: orderId,
      offerId,
      metadata: {
        sallaOrderId: orderId,
        attributed: isAttributed,
        revenue,
      },
    });
  }
}
