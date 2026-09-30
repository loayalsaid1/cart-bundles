import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerRelatedProducts,
  offerAppearance,
  recommendationOfferSettings,
} from '../../../database/schema';
import {
  CreateRecommendationOfferDto,
  UpdateRecommendationOfferDto,
} from './recommendation-offer.dto';
import { offerScheduleFields } from '../resolve-start-date';
import { appearanceValues } from '../appearance.mapper';
import { OfferSideEffectsService } from '../offer-side-effects.service';
import { RecommendationOfferFull, ServiceResult } from '../types/offers.types';

@Injectable()
export class RecommendationOfferService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly sideEffects: OfferSideEffectsService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async list(merchantId: number): Promise<RecommendationOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(
        eq(offers.merchantId, merchantId),
        eq(offers.kind, 'cart_recommendation'),
      ),
      with: {
        relatedProducts: true,
        recommendationSettings: true,
        appearance: true,
      },
    });
    return results;
  }

  async findOne(
    merchantId: number,
    offerId: number,
  ): Promise<ServiceResult<RecommendationOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: {
        relatedProducts: true,
        recommendationSettings: true,
        appearance: true,
      },
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: offer };
  }

  async create(
    merchantId: number,
    dto: CreateRecommendationOfferDto,
  ): Promise<ServiceResult<RecommendationOfferFull>> {
    const schedule = offerScheduleFields(dto.info);
    if (!schedule.ok) {
      return { success: false, reason: 'validation_error', error: schedule.error };
    }
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
          startDate: schedule.startDate,
          expiryDate: schedule.expiryDate,
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
        triggerSallaProductId:
          dto.settings.mode === 'cart_related'
            ? dto.settings.triggerSallaProductId
            : null,
      });

      await tx.insert(offerAppearance).values({
        offerId: offer.id,
        ...appearanceValues(dto.appearance),
      });

      return offer;
    });

    await this.sideEffects.afterWrite(merchantId, created.id, 'offer.created');
    return this.findOne(merchantId, created.id);
  }

  async update(
    merchantId: number,
    offerId: number,
    dto: UpdateRecommendationOfferDto,
  ): Promise<ServiceResult<RecommendationOfferFull>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;
    const schedule = offerScheduleFields(dto.info, existing.data.startDate);
    if (!schedule.ok) {
      return { success: false, reason: 'validation_error', error: schedule.error };
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(offers)
        .set({
          internalName: dto.info.internalName,
          title: dto.info.title,
          subtitle: dto.info.subtitle,
          startDate: schedule.startDate,
          expiryDate: schedule.expiryDate,
        })
        .where(eq(offers.id, offerId));

      await tx
        .delete(offerRelatedProducts)
        .where(eq(offerRelatedProducts.offerId, offerId));
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
          triggerSallaProductId:
            dto.settings.mode === 'cart_related'
              ? dto.settings.triggerSallaProductId
              : null,
        })
        .where(eq(recommendationOfferSettings.offerId, offerId));

      if (dto.appearance) {
        await tx
          .insert(offerAppearance)
          .values({
            offerId,
            ...appearanceValues(dto.appearance),
          })
          .onConflictDoUpdate({
            target: offerAppearance.offerId,
            set: appearanceValues(dto.appearance),
          });
      }
    });

    await this.sideEffects.afterWrite(merchantId, offerId, 'offer.updated');
    return this.findOne(merchantId, offerId);
  }

  async delete(
    merchantId: number,
    offerId: number,
  ): Promise<ServiceResult<void>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;

    await this.db.delete(offers).where(eq(offers.id, offerId));
    await this.sideEffects.afterWrite(merchantId, offerId, 'offer.deleted');
    return { success: true, data: undefined };
  }
}
