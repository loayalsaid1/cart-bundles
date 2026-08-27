import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerRelatedProducts,
  recommendationOfferSettings,
} from '../../../database/schema';
import { CreateRecommendationOfferDto, UpdateRecommendationOfferDto } from './recommendation-offer.dto';
import { toExpiryDate } from '../dto/common-offer.dto';
import { RecommendationOfferFull, ServiceResult } from '../types/offers.types';

@Injectable()
export class RecommendationOfferService {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  async list(merchantId: number): Promise<RecommendationOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(eq(offers.merchantId, merchantId), eq(offers.kind, 'cart_recommendation')),
      with: { relatedProducts: true, recommendationSettings: true },
    });
    return results as RecommendationOfferFull[];
  }

  async findOne(merchantId: number, offerId: number): Promise<ServiceResult<RecommendationOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: { relatedProducts: true, recommendationSettings: true },
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: offer as RecommendationOfferFull };
  }

  async create(
    merchantId: number,
    dto: CreateRecommendationOfferDto,
  ): Promise<ServiceResult<RecommendationOfferFull>> {
    const created = await this.db.transaction(async (tx) => {
      const [offer] = await tx
        .insert(offers)
        .values({
          merchantId,
          kind: 'cart_recommendation',
          internalName: dto.info.internalName,
          title: dto.info.title,
          subtitle: dto.info.subtitle,
          targetType: dto.targeting?.type ?? 'all_products',
          expiryDate: toExpiryDate(dto.info.expiryDate),
          status: 'active',
        })
        .returning();

      if (dto.settings.relatedProducts?.length) {
        await tx.insert(offerRelatedProducts).values(
          dto.settings.relatedProducts.map((p, idx) => ({
            offerId: offer.id,
            sallaProductId: p.sallaProductId,
            position: p.position ?? idx,
            isPreselected: false,
          })),
        );
      }

      await tx.insert(recommendationOfferSettings).values({
        offerId: offer.id,
        mode: dto.settings.mode,
        triggerSallaProductId: dto.settings.mode === 'cart_related' ? dto.settings.triggerSallaProductId : null,
      });

      return offer;
    });

    return this.findOne(merchantId, created.id);
  }

  async update(
    merchantId: number,
    offerId: number,
    dto: UpdateRecommendationOfferDto,
  ): Promise<ServiceResult<RecommendationOfferFull>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;

    await this.db.transaction(async (tx) => {
      await tx
        .update(offers)
        .set({
          internalName: dto.info.internalName,
          title: dto.info.title,
          subtitle: dto.info.subtitle,
          expiryDate: toExpiryDate(dto.info.expiryDate),
        })
        .where(eq(offers.id, offerId));

      await tx.delete(offerRelatedProducts).where(eq(offerRelatedProducts.offerId, offerId));
      if (dto.settings.relatedProducts?.length) {
        await tx.insert(offerRelatedProducts).values(
          dto.settings.relatedProducts.map((p, idx) => ({
            offerId,
            sallaProductId: p.sallaProductId,
            position: p.position ?? idx,
            isPreselected: false,
          })),
        );
      }

      await tx
        .update(recommendationOfferSettings)
        .set({
          mode: dto.settings.mode,
          triggerSallaProductId: dto.settings.mode === 'cart_related' ? dto.settings.triggerSallaProductId : null,
        })
        .where(eq(recommendationOfferSettings.offerId, offerId));
    });

    return this.findOne(merchantId, offerId);
  }

  async delete(merchantId: number, offerId: number): Promise<ServiceResult<void>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;

    await this.db.delete(offers).where(eq(offers.id, offerId));
    return { success: true, data: undefined };
  }
}
