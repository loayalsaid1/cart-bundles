import { Injectable } from '@nestjs/common';
import { eq, and, ilike, sql, exists, or, SQL } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { offers, offerTargets, schema } from '../../database/schema';
import { FullOffer, Offer, OfferKind, OfferStatus, ServiceResult } from './types/offers.types';

// partial type of offers plus count of targets
type DashboardOfferShort = Pick<Offer, 'id' | 'internalName' | 'kind' | 'status' | 'expiryDate'> & { targetsCount: number };


@Injectable()
export class OffersService {
  constructor(private readonly drizzleService: DrizzleService) { }

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
    return results as FullOffer[];
  }

  async toggleStatus(
    merchantId: number,
    offerId: number,
    status: 'active' | 'paused' | 'draft',
  ): Promise<ServiceResult<FullOffer>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }

    await this.db
      .update(offers)
      .set({ status })
      .where(eq(offers.id, offerId));

    const updated = await this.db.query.offers.findFirst({
      where: eq(offers.id, offerId),
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
    });

    return { success: true, data: updated as FullOffer };
  }


  async getActiveStorefrontOffers(merchantId: number, sallaProductId?: number): Promise<FullOffer[]> {

    // 1. Base conditions: Match merchant and active status
    const conditions: (SQL | undefined)[] = [
      eq(offers.merchantId, merchantId),
      eq(offers.status, 'active'),
    ];

    // 2. If a specific product is being viewed, push the filtering to SQL!
    if (sallaProductId) {
      conditions.push(
        or(
          // Either the offer applies to the whole store...
          eq(offers.targetType, 'all_products'),

          // OR it specifically targets this product in the offerTargets table
          exists(
            this.db.select()
              .from(offerTargets)
              .where(
                and(
                  eq(offerTargets.offerId, offers.id),
                  eq(offerTargets.sallaEntityId, sallaProductId)
                )
              )
          )
        )
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
    filters?: { search?: string; productId?: number; type?: OfferKind; status?: OfferStatus }
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
          this.db.select()
            .from(offerTargets)
            .where(and(
              eq(offerTargets.offerId, offers.id),
              eq(offerTargets.sallaEntityId, filters.productId)
            ))
        )
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
        SELECT count(*) 
        FROM ${offerTargets} 
        WHERE ${offerTargets.offerId} = ${offers.id}
      )::int`,
        // Aggregate stats should be here next, but after I build the stats seprate module
      })
      .from(offers)
      .where(and(...conditions))

      .orderBy(sql`${offers.createdAt} DESC`);

    return results;
  }
}
