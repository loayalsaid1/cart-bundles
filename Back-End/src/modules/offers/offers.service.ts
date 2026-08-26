import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../database/drizzle.service';
import { offers } from '../../database/schema';
import { FullOffer, ServiceResult } from './types/offers.types';

@Injectable()
export class OffersService {
  constructor(private readonly drizzleService: DrizzleService) {}

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
    const allActive = (await this.db.query.offers.findMany({
      where: and(eq(offers.merchantId, merchantId), eq(offers.status, 'active')),
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
    })) as FullOffer[];

    if (!sallaProductId) return allActive;

    return allActive.filter((offer) => {
      if (offer.targetType === 'all_products') return true;
      return offer.targets.some((t) => t.sallaEntityId === sallaProductId);
    });
  }
}
