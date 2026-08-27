import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerTargets,
  upgradeOfferSettings,
} from '../../../database/schema';
import { CreateUpgradeOfferDto, UpdateUpgradeOfferDto } from './upgrade-offer.dto';
import { toExpiryDate } from '../dto/common-offer.dto';
import { ServiceResult, UpgradeOfferFull } from '../types/offers.types';

@Injectable()
export class UpgradeOfferService {
  constructor(private readonly drizzleService: DrizzleService) {}

  private get db() {
    return this.drizzleService.db;
  }

  async list(merchantId: number): Promise<UpgradeOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(eq(offers.merchantId, merchantId), eq(offers.kind, 'upgrade_offer')),
      with: { targets: true, upgradeSettings: true },
    });
    return results as UpgradeOfferFull[];
  }

  async findOne(merchantId: number, offerId: number): Promise<ServiceResult<UpgradeOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: { targets: true, upgradeSettings: true },
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: offer as UpgradeOfferFull };
  }

  async create(merchantId: number, dto: CreateUpgradeOfferDto): Promise<ServiceResult<UpgradeOfferFull>> {
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
          expiryDate: toExpiryDate(dto.info.expiryDate),
          status: 'active',
          redirectToCartAfterAdd: dto.settings.redirectToCartAfterAdd ?? false,
          hideSallaPopup: dto.settings.hideSallaPopup ?? true,
        })
        .returning();

      if (dto.targeting.ids?.length) {
        await tx.insert(offerTargets).values(
          dto.targeting.ids.map((id) => ({
            offerId: offer.id,
            entityType: dto.targeting.type === 'selected_categories' ? ('category' as const) : ('product' as const),
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

      return offer;
    });

    return this.findOne(merchantId, created.id);
  }

  async update(
    merchantId: number,
    offerId: number,
    dto: UpdateUpgradeOfferDto,
  ): Promise<ServiceResult<UpgradeOfferFull>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;

    await this.db.transaction(async (tx) => {
      await tx
        .update(offers)
        .set({
          internalName: dto.info.internalName,
          title: dto.info.title,
          subtitle: dto.info.subtitle,
          targetType: dto.targeting.type,
          expiryDate: toExpiryDate(dto.info.expiryDate),
          redirectToCartAfterAdd: dto.settings.redirectToCartAfterAdd ?? false,
          hideSallaPopup: dto.settings.hideSallaPopup ?? true,
        })
        .where(eq(offers.id, offerId));

      await tx.delete(offerTargets).where(eq(offerTargets.offerId, offerId));
      if (dto.targeting.ids?.length) {
        await tx.insert(offerTargets).values(
          dto.targeting.ids.map((id) => ({
            offerId,
            entityType: dto.targeting.type === 'selected_categories' ? ('category' as const) : ('product' as const),
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
