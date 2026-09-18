import { Injectable, Logger } from '@nestjs/common';
import { eq, and, ilike, sql, exists, or, inArray, SQL } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { offerStats } from '../../database/entities/activity-logs';
import {
  offers,
  offerTargets,
  upgradeOfferSettings,
  recommendationOfferSettings,
} from '../../database/schema';
import {
  CACHE_TTL_SECONDS,
  dashboardOffersCacheKey,
  storefrontOffersCacheKey,
} from '../../redis/redis.constants';
import { RedisService } from '../../redis/redis.service';
import { OfferSideEffectsService } from './offer-side-effects.service';
import { MerchantsService } from '../merchants/merchants.service';
import {
  DashboardOfferShort,
  FullOffer,
  Offer,
  OfferKind,
  OfferStatus,
  ServiceResult,
} from './types/offers.types';

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly merchantsService: MerchantsService,
    private readonly redis: RedisService,
    private readonly sideEffects: OfferSideEffectsService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async findAllForMerchant(merchantId: number): Promise<FullOffer[]> {
    const results = await this.db.query.offers.findMany({
      where: eq(offers.merchantId, merchantId),
      with: {
        targets: true,
        relatedProducts: true,
        appearance: true,
        quantitySettings: true,
        quantityTiers: true,
        addonSettings: true,
        bundleSettings: true,
        upgradeSettings: true,
        recommendationSettings: true,
      },
      orderBy: (o, { desc }) => [desc(o.createdAt)],
    });
    return results;
  }

  async toggleStatus(
    merchantId: number,
    offerId: number,
    status: OfferStatus,
  ): Promise<ServiceResult<Pick<Offer, 'id' | 'status'>>> {
    const [offer] = await this.db
      .update(offers)
      .set({ status })
      .where(and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)))
      .returning({
        id: offers.id,
        status: offers.status,
        sallaOfferId: offers.sallaOfferId,
      });

    if (!offer) {
      return { success: false, reason: 'not_found' };
    }

    if (offer.sallaOfferId) {
      try {
        const tokenRes =
          await this.merchantsService.getValidAccessToken(merchantId);
        if (tokenRes.success) {
          await fetch(
            `https://api.salla.dev/admin/v2/specialoffers/${offer.sallaOfferId}/status`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${tokenRes.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                status: status === 'active' ? 'active' : 'inactive',
              }),
            },
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to toggle Salla offer ${offer.sallaOfferId} status`,
          err,
        );
        await this.sideEffects.afterSallaSyncFailed(
          merchantId,
          offerId,
          'Failed to sync offer status to Salla',
        );
      }
    }

    await this.sideEffects.afterWrite(merchantId, offerId, 'offer.status_changed', { status });

    return { success: true, data: { id: offer.id, status: offer.status } };
  }

  async getActiveStorefrontOffers(
    merchantId: number,
    sallaProductId?: number,
    categoryIds?: number[],
  ): Promise<FullOffer[]> {
    return this.redis.getOrSet(
      storefrontOffersCacheKey(merchantId, sallaProductId, categoryIds),
      CACHE_TTL_SECONDS.STOREFRONT_OFFERS,
      () =>
        this.loadActiveStorefrontOffers(
          merchantId,
          sallaProductId,
          categoryIds,
        ),
    );
  }

  private async loadActiveStorefrontOffers(
    merchantId: number,
    sallaProductId?: number,
    categoryIds?: number[],
  ): Promise<FullOffer[]> {
    // 1. Base conditions: Match merchant and active status
    const conditions: (SQL | undefined)[] = [
      eq(offers.merchantId, merchantId),
      eq(offers.status, 'active'),
    ];

    // 2. Build target entity IDs array (productId + categoryIds)
    const targetEntityIds: number[] = [];
    if (sallaProductId) targetEntityIds.push(sallaProductId);
    if (categoryIds && categoryIds.length > 0) {
      targetEntityIds.push(...categoryIds);
    }

    // 3. If target entity IDs exist, push SQL condition for product / category matching
    if (targetEntityIds.length > 0) {
      conditions.push(
        or(
          // Either the offer applies to the whole store...
          eq(offers.targetType, 'all_products'),

          // OR it targets this product or any of its categories in offerTargets
          exists(
            this.db
              .select()
              .from(offerTargets)
              .where(
                and(
                  eq(offerTargets.offerId, offers.id),
                  inArray(offerTargets.sallaEntityId, targetEntityIds),
                ),
              ),
          ),
        ),
      );
    }

    // 3. Execute the highly-optimized query
    const results = await this.db.query.offers.findMany({
      where: and(...conditions),
      with: {
        relatedProducts: true,
        appearance: true,
        quantitySettings: true,
        quantityTiers: true,
        addonSettings: true,
        bundleSettings: true,
        upgradeSettings: true,
        recommendationSettings: true,
      },
    });

    return results as FullOffer[];
  }

  async getDashboardOffers(
    merchantId: number,
    filters?: {
      search?: string;
      productId?: number;
      type?: OfferKind;
      status?: OfferStatus;
    },
  ): Promise<DashboardOfferShort[]> {
    return this.redis.getOrSet(
      dashboardOffersCacheKey(merchantId, { ...(filters ?? {}) }),
      CACHE_TTL_SECONDS.DASHBOARD,
      () => this.loadDashboardOffers(merchantId, filters),
    );
  }

  private async loadDashboardOffers(
    merchantId: number,
    filters?: {
      search?: string;
      productId?: number;
      type?: OfferKind;
      status?: OfferStatus;
    },
  ): Promise<DashboardOfferShort[]> {
    // 1. Build dynamic WHERE conditions
    const conditions = [eq(offers.merchantId, merchantId)];

    if (filters?.search) {
      conditions.push(ilike(offers.internalName, `%${filters.search}%`));
    }
    if (filters?.type) {
      conditions.push(eq(offers.kind, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(offers.status, filters.status));
    }

    // 4. Logic to filter based on products included using EXISTS (Highly optimized in SQL)
    if (filters?.productId) {
      conditions.push(
        exists(
          this.db
            .select()
            .from(offerTargets)
            .where(
              and(
                eq(offerTargets.offerId, offers.id),
                eq(offerTargets.sallaEntityId, filters.productId),
              ),
            ),
        ),
      );
    }

    // 2. Query with Subqueries for Counts (Avoids N+1 and massive memory consumption)
    const results = await this.db
      .select({
        id: offers.id,
        internalName: offers.internalName,
        kind: offers.kind,
        status: offers.status,
        expiryDate: offers.expiryDate,
        // Aggregating targets count directly in PostgreSQL
        targetsCount: sql<number>`(
          SELECT (
            (SELECT count(*) FROM ${offerTargets} WHERE ${offerTargets.offerId} = ${offers.id}) +
            (SELECT count(*) FROM ${upgradeOfferSettings} WHERE ${upgradeOfferSettings.offerId} = ${offers.id}) +
            (SELECT count(*) FROM ${recommendationOfferSettings} WHERE ${recommendationOfferSettings.offerId} = ${offers.id} AND ${recommendationOfferSettings.triggerSallaProductId} IS NOT NULL)
          )
        )::int`,
        impressions: sql<number>`coalesce((
          SELECT ${offerStats.impressions} FROM ${offerStats}
          WHERE ${offerStats.offerId} = ${offers.id}
        ), 0)::int`,
        clicks: sql<number>`coalesce((
          SELECT ${offerStats.clicks} FROM ${offerStats}
          WHERE ${offerStats.offerId} = ${offers.id}
        ), 0)::int`,
        addToCart: sql<number>`coalesce((
          SELECT ${offerStats.addToCart} FROM ${offerStats}
          WHERE ${offerStats.offerId} = ${offers.id}
        ), 0)::int`,
        conversions: sql<number>`coalesce((
          SELECT ${offerStats.conversions} FROM ${offerStats}
          WHERE ${offerStats.offerId} = ${offers.id}
        ), 0)::int`,
      })
      .from(offers)
      .where(and(...conditions))

      .orderBy(sql`${offers.createdAt} DESC`);

    return results;
  }
}
