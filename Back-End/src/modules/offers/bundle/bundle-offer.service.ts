import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerTargets,
  offerRelatedProducts,
  offerAppearance,
  bundleOfferSettings,
} from '../../../database/schema';
import { MerchantsService } from '../../merchants/merchants.service';
import { CreateBundleOfferDto, UpdateBundleOfferDto } from './bundle-offer.dto';
import { toExpiryDate } from '../dto/common-offer.dto';
import { BundleOfferFull, ServiceResult } from '../types/offers.types';

const SALLA_SPECIAL_OFFERS_URL = 'https://api.salla.dev/admin/v2/specialoffers';

@Injectable()
export class BundleOfferService {
  private readonly logger = new Logger(BundleOfferService.name);

  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly merchantsService: MerchantsService,
  ) {}

  private get db() {
    return this.drizzleService.db;
  }

  async list(merchantId: number): Promise<BundleOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(eq(offers.merchantId, merchantId), eq(offers.kind, 'bundle')),
      with: { targets: true, relatedProducts: true, bundleSettings: true, appearance: true },
    });
    return results as BundleOfferFull[];
  }

  async findOne(merchantId: number, offerId: number): Promise<ServiceResult<BundleOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: { targets: true, relatedProducts: true, bundleSettings: true, appearance: true },
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: offer as BundleOfferFull };
  }

  async create(merchantId: number, dto: CreateBundleOfferDto): Promise<ServiceResult<BundleOfferFull>> {
    const created = await this.db.transaction(async (tx) => {
      const [offer] = await tx
        .insert(offers)
        .values({
          merchantId,
          kind: 'bundle',
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
            entityType: dto.targeting.type === 'selected_categories' ? ('category' as const) : ('product' as const),
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
            isPreselected: p.isPreselected ?? true,
          })),
        );
      }

      await tx.insert(bundleOfferSettings).values({
        offerId: offer.id,
        discountType: dto.settings.discountType,
        discountAmount: dto.settings.discountAmount !== undefined ? String(dto.settings.discountAmount) : null,
      });

      await tx.insert(offerAppearance).values({
        offerId: offer.id,
        borderRadiusPx: dto.appearance?.borderRadiusPx ?? 0,
        colors: dto.appearance?.colors ?? {},
      });

      return offer;
    });

    const syncRes = await this.syncToSalla(merchantId, created.id);
    if (!syncRes.success) {
      this.logger.warn(`Bundle offer ${created.id} created locally, but Salla sync failed: ${syncRes.error}`);
    }

    return this.findOne(merchantId, created.id);
  }

  async update(
    merchantId: number,
    offerId: number,
    dto: UpdateBundleOfferDto,
  ): Promise<ServiceResult<BundleOfferFull>> {
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

      await tx.delete(offerRelatedProducts).where(eq(offerRelatedProducts.offerId, offerId));
      if (dto.settings.relatedProducts?.length) {
        await tx.insert(offerRelatedProducts).values(
          dto.settings.relatedProducts.map((p, idx) => ({
            offerId,
            sallaProductId: p.sallaProductId,
            position: p.position ?? idx,
            isPreselected: p.isPreselected ?? true,
          })),
        );
      }

      await tx
        .update(bundleOfferSettings)
        .set({
          discountType: dto.settings.discountType,
          discountAmount: dto.settings.discountAmount !== undefined ? String(dto.settings.discountAmount) : null,
        })
        .where(eq(bundleOfferSettings.offerId, offerId));

      if (dto.appearance) {
        await tx
          .update(offerAppearance)
          .set({
            borderRadiusPx: dto.appearance.borderRadiusPx ?? 0,
            colors: dto.appearance.colors ?? {},
          })
          .where(eq(offerAppearance.offerId, offerId));
      }
    });

    const syncRes = await this.syncToSalla(merchantId, offerId);
    if (!syncRes.success) {
      this.logger.warn(`Bundle offer ${offerId} updated locally, but Salla sync failed: ${syncRes.error}`);
    }

    return this.findOne(merchantId, offerId);
  }

  async delete(merchantId: number, offerId: number): Promise<ServiceResult<void>> {
    const existing = await this.findOne(merchantId, offerId);
    if (!existing.success) return existing;

    const offer = existing.data;
    if (offer.sallaOfferId) {
      try {
        const tokenRes = await this.merchantsService.getValidAccessToken(merchantId);
        if (tokenRes.success) {
          await fetch(`${SALLA_SPECIAL_OFFERS_URL}/${offer.sallaOfferId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenRes.accessToken}` },
          });
        }
      } catch (err) {
        this.logger.error(`Failed to delete Salla offer ${offer.sallaOfferId}`, err);
      }
    }

    await this.db.delete(offers).where(eq(offers.id, offerId));
    return { success: true, data: undefined };
  }

  private async syncToSalla(
    merchantId: number,
    offerId: number,
  ): Promise<{ success: boolean; sallaOfferId?: number; error?: string }> {
    try {
      const found = await this.findOne(merchantId, offerId);
      if (!found.success) return { success: false, error: 'Bundle offer not found' };

      const offer = found.data;
      const tokenRes = await this.merchantsService.getValidAccessToken(merchantId);
      if (!tokenRes.success) {
        return { success: false, error: 'Merchant access token unavailable' };
      }

      const isCategory = offer.targetType === 'selected_categories';
      const entityIds = offer.targets.map((t) => Number(t.sallaEntityId)).filter(Boolean);
      const offerProductIds = offer.relatedProducts.map((rp) => Number(rp.sallaProductId)).filter(Boolean);

      const payload: Record<string, unknown> = {
        name: offer.internalName,
        message: offer.title?.['ar'] ?? offer.internalName,
        applied_channel: 'browser_and_application',
        applied_to: offer.targetType === 'all_products' ? 'all_products' : isCategory ? 'category' : 'product',
        start_date: new Date().toISOString().slice(0, 10),
        expiry_date: offer.expiryDate?.toISOString().slice(0, 10),
        offer_type: 'bundle',
        offer_products: offerProductIds,
      };

      if (offer.bundleSettings?.discountType && offer.bundleSettings?.discountAmount) {
        payload.discount_type = offer.bundleSettings.discountType;
        payload.discount_amount = Number(offer.bundleSettings.discountAmount);
      }

      if (offer.targetType !== 'all_products') {
        if (isCategory) {
          payload.categories = entityIds;
        } else {
          payload.products = entityIds;
        }
      }

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
        const json = (await response.json()) as { data?: { id?: number | string }; id?: number | string };
        const sallaId = Number(json.data?.id ?? json.id ?? offer.sallaOfferId);
        await this.db
          .update(offers)
          .set({ sallaOfferId: sallaId, status: 'active' })
          .where(eq(offers.id, offerId));
        return { success: true, sallaOfferId: sallaId };
      }

      const errText = await response.text();
      return { success: false, error: `Salla returned ${response.status}: ${errText}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown sync error';
      return { success: false, error: msg };
    }
  }
}
