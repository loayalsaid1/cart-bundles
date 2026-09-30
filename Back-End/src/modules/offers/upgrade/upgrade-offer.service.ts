import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerTargets,
  offerAppearance,
  upgradeOfferSettings,
} from '../../../database/schema';
import {
  CreateUpgradeOfferDto,
  UpdateUpgradeOfferDto,
} from './upgrade-offer.dto';
import { offerScheduleFields } from '../resolve-start-date';
import { appearanceValues } from '../appearance.mapper';
import { OfferSideEffectsService } from '../offer-side-effects.service';
import { ServiceResult, UpgradeOfferFull } from '../types/offers.types';

@Injectable()
export class UpgradeOfferService {
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly sideEffects: OfferSideEffectsService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async list(merchantId: number): Promise<UpgradeOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(
        eq(offers.merchantId, merchantId),
        eq(offers.kind, 'upgrade_offer'),
      ),
      with: { targets: true, upgradeSettings: true, appearance: true },
    });
    return results;
  }

  async findOne(
    merchantId: number,
    offerId: number,
  ): Promise<ServiceResult<UpgradeOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: { targets: true, upgradeSettings: true, appearance: true },
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: offer };
  }

  async create(
    merchantId: number,
    dto: CreateUpgradeOfferDto,
  ): Promise<ServiceResult<UpgradeOfferFull>> {
    const schedule = offerScheduleFields(dto.info);
    if (!schedule.ok) {
      return { success: false, reason: 'validation_error', error: schedule.error };
    }
    const created = await this.db.transaction(async (tx) => {
      const [offer] = await tx
        .insert(offers)
        .values({
          merchantId,
          kind: 'upgrade_offer',
          internalName: dto.info.internalName,
          title: dto.info.title,
          subtitle: dto.info.subtitle,
          targetType: dto.targeting.type,
          startDate: schedule.startDate,
          expiryDate: schedule.expiryDate,
          status: 'active',
          redirectToCartAfterAdd: dto.settings.redirectToCartAfterAdd ?? false,
          hideSallaPopup: dto.settings.hideSallaPopup ?? true,
        })
        .returning();

      const targetProductIds =
        dto.targeting?.ids?.length
          ? dto.targeting.ids
          : [dto.settings.baseSallaProductId];

      if (targetProductIds.length) {
        await tx.insert(offerTargets).values(
          targetProductIds.map((id) => ({
            offerId: offer.id,
            entityType: 'product' as const,
            sallaEntityId: id,
          })),
        );
      }

      await tx.insert(upgradeOfferSettings).values({
        offerId: offer.id,
        baseSallaProductId: dto.settings.baseSallaProductId,
        upgradeSallaProductId: dto.settings.upgradeSallaProductId,
        couponCode: dto.settings.couponCode,
        sallaCouponId: dto.settings.sallaCouponId,
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
    dto: UpdateUpgradeOfferDto,
  ): Promise<ServiceResult<UpgradeOfferFull>> {
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
          targetType: dto.targeting.type,
          startDate: schedule.startDate,
          expiryDate: schedule.expiryDate,
          redirectToCartAfterAdd: dto.settings.redirectToCartAfterAdd ?? false,
          hideSallaPopup: dto.settings.hideSallaPopup ?? true,
        })
        .where(eq(offers.id, offerId));

      await tx.delete(offerTargets).where(eq(offerTargets.offerId, offerId));
      const targetProductIds =
        dto.targeting?.ids?.length
          ? dto.targeting.ids
          : [dto.settings.baseSallaProductId];

      if (targetProductIds.length) {
        await tx.insert(offerTargets).values(
          targetProductIds.map((id) => ({
            offerId,
            entityType: 'product' as const,
            sallaEntityId: id,
          })),
        );
      }

      await tx
        .update(upgradeOfferSettings)
        .set({
          baseSallaProductId: dto.settings.baseSallaProductId,
          upgradeSallaProductId: dto.settings.upgradeSallaProductId,
          couponCode: dto.settings.couponCode,
          sallaCouponId: dto.settings.sallaCouponId,
        })
        .where(eq(upgradeOfferSettings.offerId, offerId));

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
