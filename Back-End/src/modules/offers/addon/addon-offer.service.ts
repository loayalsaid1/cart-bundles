import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerTargets,
  offerRelatedProducts,
  offerAppearance,
  addonOfferSettings,
} from '../../../database/schema';
import { MerchantsService } from '../../merchants/merchants.service';
import { OfferSideEffectsService } from '../offer-side-effects.service';
import { CreateAddonOfferDto, UpdateAddonOfferDto } from './addon-offer.dto';
import { toExpiryDate, formatSallaDate, formatSallaStartDate } from '../dto/common-offer.dto';
import { appearanceValues } from '../appearance.mapper';
import { AddonOfferFull, ServiceResult } from '../types/offers.types';

const SALLA_SPECIAL_OFFERS_URL = 'https://api.salla.dev/admin/v2/specialoffers';

@Injectable()
export class AddonOfferService {
  private readonly logger = new Logger(AddonOfferService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly merchantsService: MerchantsService,
    private readonly sideEffects: OfferSideEffectsService,
  ) { }

  private get db() {
    return this.drizzleService.db;
  }

  async list(merchantId: number): Promise<AddonOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(
        eq(offers.merchantId, merchantId),
        eq(offers.kind, 'product_add_on'),
      ),
      with: {
        targets: true,
        relatedProducts: true,
        addonSettings: true,
        appearance: true,
      },
    });
    return results;
  }

  async findOne(
    merchantId: number,
    offerId: number,
  ): Promise<ServiceResult<AddonOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: {
        targets: true,
        relatedProducts: true,
        addonSettings: true,
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
    dto: CreateAddonOfferDto,
  ): Promise<ServiceResult<AddonOfferFull>> {
    const created = await this.db.transaction(async (tx) => {
      const [offer] = await tx
        .insert(offers)
        .values({
          merchantId,
          kind: 'product_add_on',
          internalName: dto.info.internalName,
          title: dto.info.title,
          subtitle: dto.info.subtitle,
          targetType: dto.targeting.type,
          expiryDate: toExpiryDate(dto.info.expiryDate),
          status: 'draft',
          redirectToCartAfterAdd: dto.settings.redirectToCartAfterAdd ?? false,
          hideSallaPopup: dto.settings.hideSallaPopup ?? true,
        })
        .returning();

      if (dto.targeting.ids?.length) {
        await tx.insert(offerTargets).values(
          dto.targeting.ids.map((id) => ({
            offerId: offer.id,
            entityType:
              dto.targeting.type === 'selected_categories'
                ? ('category' as const)
                : ('product' as const),
            sallaEntityId: id,
          })),
        );
      }

      if (dto.settings.relatedProducts?.length) {
        await tx.insert(offerRelatedProducts).values(
          dto.settings.relatedProducts.map((p, idx) => ({
            offerId: offer.id,
            sallaProductId: p.sallaProductId,
            position: p.position ?? idx,
            isPreselected: p.isPreselected ?? false,
          })),
        );
      }

      await tx.insert(addonOfferSettings).values({
        offerId: offer.id,
        maxItems: dto.settings.maxItems ?? 8,
        productsPreselectedByDefault:
          dto.settings.productsPreselectedByDefault ?? false,
        showProductOptions: dto.settings.showProductOptions ?? false,
        displayOrientation: dto.settings.displayOrientation ?? 'horizontal',
        discountType: dto.settings.discountType,
        discountAmount:
          dto.settings.discountAmount !== undefined
            ? String(dto.settings.discountAmount)
            : null,
        positionDesktop: dto.settings.positionDesktop,
        positionMobile: dto.settings.positionMobile,
      });

      await tx.insert(offerAppearance).values({
        offerId: offer.id,
        ...appearanceValues(dto.appearance),
      });

      return offer;
    });

    const syncRes = await this.syncToSalla(merchantId, created.id);
    if (!syncRes.success) {
      this.logger.warn(
        `Addon offer ${created.id} created locally, but Salla sync failed: ${syncRes.error}`,
      );
      await this.db.delete(offers).where(eq(offers.id, created.id));
      await this.sideEffects.afterSallaSyncFailed(
        merchantId,
        created.id,
        syncRes.error ?? 'Unknown Salla API error',
      );
      return {
        success: false,
        reason: 'salla_sync_failed',
        error: syncRes.error ?? 'Unknown Salla API error',
      };
    }

    await this.sideEffects.afterWrite(merchantId, created.id, 'offer.created');
    return this.findOne(merchantId, created.id);
  }

  async update(
    merchantId: number,
    offerId: number,
    dto: UpdateAddonOfferDto,
  ): Promise<ServiceResult<AddonOfferFull>> {
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
            entityType:
              dto.targeting.type === 'selected_categories'
                ? ('category' as const)
                : ('product' as const),
            sallaEntityId: id,
          })),
        );
      }

      await tx
        .delete(offerRelatedProducts)
        .where(eq(offerRelatedProducts.offerId, offerId));
      if (dto.settings.relatedProducts?.length) {
        await tx.insert(offerRelatedProducts).values(
          dto.settings.relatedProducts.map((p, idx) => ({
            offerId,
            sallaProductId: p.sallaProductId,
            position: p.position ?? idx,
            isPreselected: p.isPreselected ?? false,
          })),
        );
      }

      await tx
        .update(addonOfferSettings)
        .set({
          maxItems: dto.settings.maxItems ?? 8,
          productsPreselectedByDefault:
            dto.settings.productsPreselectedByDefault ?? false,
          showProductOptions: dto.settings.showProductOptions ?? false,
          displayOrientation: dto.settings.displayOrientation ?? 'horizontal',
          discountType: dto.settings.discountType,
          discountAmount:
            dto.settings.discountAmount !== undefined
              ? String(dto.settings.discountAmount)
              : null,
          positionDesktop: dto.settings.positionDesktop,
          positionMobile: dto.settings.positionMobile,
        })
        .where(eq(addonOfferSettings.offerId, offerId));

      if (dto.appearance) {
        await tx
          .update(offerAppearance)
          .set(appearanceValues(dto.appearance))
          .where(eq(offerAppearance.offerId, offerId));
      }
    });

    const syncRes = await this.syncToSalla(merchantId, offerId);
    if (!syncRes.success) {
      this.logger.warn(
        `Addon offer ${offerId} updated locally, but Salla sync failed: ${syncRes.error}`,
      );
      await this.sideEffects.afterSallaSyncFailed(
        merchantId,
        offerId,
        syncRes.error ?? 'Unknown Salla API error',
      );
    }

    await this.sideEffects.afterWrite(merchantId, offerId, 'offer.updated');
    return this.findOne(merchantId, offerId);
  }

  async delete(
    merchantId: number,
    offerId: number,
  ): Promise<ServiceResult<void>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;

    const offer = existing.data;
    if (offer.sallaOfferId) {
      await this.deleteSallaOffer(merchantId, offer.sallaOfferId);
    }

    await this.db.delete(offers).where(eq(offers.id, offerId));
    await this.sideEffects.afterWrite(merchantId, offerId, 'offer.deleted');
    return { success: true, data: undefined };
  }

  private async deleteSallaOffer(
    merchantId: number,
    sallaOfferId: number,
  ): Promise<boolean> {
    try {
      const tokenRes =
        await this.merchantsService.getValidAccessToken(merchantId);
      if (tokenRes.success) {
        const res = await fetch(`${SALLA_SPECIAL_OFFERS_URL}/${sallaOfferId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tokenRes.accessToken}` },
        });
        return res.ok;
      }
    } catch (err) {
      this.logger.error(
        `Failed to delete Salla offer ${sallaOfferId}`,
        err,
      );
    }
    return false;
  }

  private async syncToSalla(
    merchantId: number,
    offerId: number,
  ): Promise<{ success: boolean; sallaOfferId?: number; error?: string }> {
    try {
      const found = await this.findOne(merchantId, offerId);
      if (!found.success)
        return { success: false, error: 'Addon offer not found' };

      const offer = found.data;
      const tokenRes =
        await this.merchantsService.getValidAccessToken(merchantId);
      if (!tokenRes.success) {
        return { success: false, error: 'Merchant access token unavailable' };
      }

      const rawDiscountType = offer.addonSettings?.discountType;
      const hasDiscount = Boolean(rawDiscountType);

      // --- 1. Handle No Discount State ---
      if (!hasDiscount) {
        if (offer.sallaOfferId) {
          this.logger.log(
            `Addon offer ${offerId} updated to have no discount. Deleting Salla offer ${offer.sallaOfferId}`,
          );
          await this.deleteSallaOffer(merchantId, offer.sallaOfferId);
          await this.db
            .update(offers)
            .set({ sallaOfferId: null })
            .where(eq(offers.id, offerId));
        }
        return { success: true };
      }

      const isCategory = offer.targetType === 'selected_categories';
      const entityIds = offer.targets
        .map((t) => Number(t.sallaEntityId))
        .filter(Boolean);
      const offerProductIds = offer.relatedProducts
        .map((rp) => Number(rp.sallaProductId))
        .filter(Boolean);

      const startDateStr = formatSallaStartDate();
      let expiryDateStr: string | undefined = undefined;
      if (offer.expiryDate) {
        const exp = new Date(offer.expiryDate);
        if (!isNaN(exp.getTime())) {
          if (
            exp.getHours() === 0 &&
            exp.getMinutes() === 0 &&
            exp.getSeconds() === 0
          ) {
            exp.setHours(23, 59, 59);
          }
          expiryDateStr = formatSallaDate(exp);
        }
      }

      // --- 2. Determine discount type for Salla API ---
      // Salla API expects 'free-product' (with hyphen) for free products
      const isFreeProduct = rawDiscountType === 'free-product';

      // Currenty, same as the enum from teh API anyway.. but very soon, i'm extending this
      const sallaDiscountType: 'percentage' | 'free-product' = isFreeProduct
        ? 'free-product'
        : 'percentage';

      const discountAmount = isFreeProduct
        ? 0
        : Number(offer.addonSettings?.discountAmount || 0);

      const appliedTo = isCategory ? 'category' : 'product';
      const buyObj = isCategory
        ? { type: 'category', quantity: 1, categories: entityIds }
        : { type: 'product', quantity: 1, products: entityIds };

      const getObj = {
        type: 'product',
        quantity: 1,
        products: offerProductIds,
        discount_type: sallaDiscountType,
        ...(!isFreeProduct ? { discount_amount: discountAmount } : {}),
      };

      const sallaStatus =
        offer.status === 'paused' ? 'inactive' : 'active';

      const payload: Record<string, unknown> = {
        name: offer.internalName,
        message: offer.title?.['ar'] ?? offer.internalName,
        applied_channel: 'browser_and_application',
        applied_to: appliedTo,
        start_date: startDateStr,
        offer_type: 'buy_x_get_y',
        buy: buyObj,
        get: getObj,
        status: sallaStatus,
      };

      if (expiryDateStr) {
        payload.expiry_date = expiryDateStr;
      }
      this.logger.debug('Payload:', JSON.stringify(payload));
      const url = offer.sallaOfferId
        ? `${SALLA_SPECIAL_OFFERS_URL}/${offer.sallaOfferId}`
        : SALLA_SPECIAL_OFFERS_URL;
      const method = offer.sallaOfferId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${tokenRes.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const json = (await response.json()) as {
          data?: { id?: number | string };
          id?: number | string;
        };
        const sallaId = Number(json.data?.id ?? json.id ?? offer.sallaOfferId);
        await this.db
          .update(offers)
          .set({
            sallaOfferId: sallaId,
            status: offer.status === 'draft' ? 'active' : offer.status,
          })
          .where(eq(offers.id, offerId));
        return { success: true, sallaOfferId: sallaId };
      }

      const errText = await response.text();
      return {
        success: false,
        error: `Salla returned ${response.status}: ${errText}`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error';
      return { success: false, error: msg };
    }
  }
}

