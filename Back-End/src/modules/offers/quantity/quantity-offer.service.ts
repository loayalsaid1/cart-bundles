import { Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../../../database/drizzle.service';
import {
  offers,
  offerTargets,
  offerAppearance,
  quantityOfferSettings,
  quantityOfferTiers,
} from '../../../database/schema';
import { MerchantsService } from '../../merchants/merchants.service';
import { CreateQuantityOfferDto, UpdateQuantityOfferDto } from './quantity-offer.dto';
import { toExpiryDate } from '../dto/common-offer.dto';
import { QuantityOfferFull, ServiceResult } from '../types/offers.types';
const SALLA_SPECIAL_OFFERS_URL = 'https://api.salla.dev/admin/v2/specialoffers';
@Injectable()
export class QuantityOfferService {
  private readonly logger = new Logger(QuantityOfferService.name);
  constructor(
    private readonly drizzleService: DrizzleService,
    private readonly merchantsService: MerchantsService,
  ) {}
  private get db() {
    return this.drizzleService.db;
  }
  async list(merchantId: number): Promise<QuantityOfferFull[]> {
    const results = await this.db.query.offers.findMany({
      where: and(eq(offers.merchantId, merchantId), eq(offers.kind, 'quantity_discount')),
      with: { targets: true, quantityTiers: true, quantitySettings: true, appearance: true },
    });
    return results as QuantityOfferFull[];
  }
  async findOne(merchantId: number, offerId: number): Promise<ServiceResult<QuantityOfferFull>> {
    const offer = await this.db.query.offers.findFirst({
      where: and(eq(offers.id, offerId), eq(offers.merchantId, merchantId)),
      with: { targets: true, quantityTiers: true, quantitySettings: true, appearance: true },
    });
    if (!offer) {
      return { success: false, reason: 'not_found' };
    }
    return { success: true, data: offer as QuantityOfferFull };
  }
  async create(merchantId: number, dto: CreateQuantityOfferDto): Promise<ServiceResult<QuantityOfferFull>> {
    const created = await this.db.transaction(async (tx) => {
      const [offer] = await tx
        .insert(offers)
        .values({
          merchantId,
          kind: 'quantity_discount',
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
      await tx.insert(quantityOfferSettings).values({
        offerId: offer.id,
        allowDifferentOptionsPerPiece: dto.settings.allowDifferentOptionsPerPiece ?? false,
        hideThemeDefaultOptions: dto.settings.hideThemeDefaultOptions ?? false,
        showPricePerPiece: dto.settings.showPricePerPiece ?? false,
        roundPriceToNearestInteger: dto.settings.roundPriceToNearestInteger ?? false,
        applyEvenWithCoupon: dto.settings.applyEvenWithCoupon ?? true,
        hideQuantityField: dto.settings.hideQuantityField ?? false,
      });
      if (dto.settings.tiers?.length) {
        await tx.insert(quantityOfferTiers).values(
          dto.settings.tiers.map((tier, position) => ({
            offerId: offer.id,
            position,
            quantity: tier.quantity,
            mainTitle: tier.mainTitle,
            subtitle: tier.subtitle,
            pricingType: tier.pricingType,
            discountAmount: String(tier.discountAmount),
            isSelectedByDefault: tier.isSelectedByDefault ?? false,
            badgeText: tier.badgeText,
            labelText: tier.labelText,
          })),
        );
      }
      await tx.insert(offerAppearance).values({
        offerId: offer.id,
        borderRadiusPx: dto.appearance?.borderRadiusPx ?? 0,
        colors: dto.appearance?.colors ?? {},
      });
      return offer;
    });
    const syncRes = await this.syncToSalla(merchantId, created.id);
    if (!syncRes.success) {
      this.logger.warn(`Offer ${created.id} created locally, but Salla sync failed: ${syncRes.error}`);
    }
    return this.findOne(merchantId, created.id);
  }
  async update(
    merchantId: number,
    offerId: number,
    dto: UpdateQuantityOfferDto,
  ): Promise<ServiceResult<QuantityOfferFull>> {
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
          updatedAt: new Date(),
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
        .update(quantityOfferSettings)
        .set({
          allowDifferentOptionsPerPiece: dto.settings.allowDifferentOptionsPerPiece ?? false,
          hideThemeDefaultOptions: dto.settings.hideThemeDefaultOptions ?? false,
          showPricePerPiece: dto.settings.showPricePerPiece ?? false,
          roundPriceToNearestInteger: dto.settings.roundPriceToNearestInteger ?? false,
          applyEvenWithCoupon: dto.settings.applyEvenWithCoupon ?? true,
          hideQuantityField: dto.settings.hideQuantityField ?? false,
        })
        .where(eq(quantityOfferSettings.offerId, offerId));
      await tx.delete(quantityOfferTiers).where(eq(quantityOfferTiers.offerId, offerId));
      if (dto.settings.tiers?.length) {
        await tx.insert(quantityOfferTiers).values(
          dto.settings.tiers.map((tier, position) => ({
            offerId,
            position,
            quantity: tier.quantity,
            mainTitle: tier.mainTitle,
            subtitle: tier.subtitle,
            pricingType: tier.pricingType,
            discountAmount: String(tier.discountAmount),
            isSelectedByDefault: tier.isSelectedByDefault ?? false,
            badgeText: tier.badgeText,
            labelText: tier.labelText,
          })),
        );
      }
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
      this.logger.warn(`Offer ${offerId} updated locally, but Salla sync failed: ${syncRes.error}`);
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
      if (!found.success) return { success: false, error: 'Offer not found' };
      const offer = found.data;
      const tokenRes = await this.merchantsService.getValidAccessToken(merchantId);
      if (!tokenRes.success) {
        return { success: false, error: 'Merchant access token unavailable' };
      }
      const isCategory = offer.targetType === 'selected_categories';
      const isAll = offer.targetType === 'all_products';
      const entityIds = offer.targets.map((t) => Number(t.sallaEntityId)).filter(Boolean);

      const pad = (n: number) => String(n).padStart(2, '0');
      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      const startDateStr = formatDate(new Date());
      const expiryDateStr = offer.expiryDate ? formatDate(new Date(offer.expiryDate)) : undefined;

      const tiers = offer.quantityTiers
        .sort((a, b) => a.position - b.position)
        .map((t) => ({
          quantity: t.quantity,
          discount_type: t.pricingType,
          discount_amount: Number(t.discountAmount),
        }));

      const appliedTo = isAll ? 'order' : isCategory ? 'category' : 'product';

      const payload: Record<string, unknown> = {
        name: offer.internalName,
        message: offer.title?.['ar'] ?? offer.internalName,
        applied_channel: 'browser_and_application',
        applied_to: appliedTo,
        start_date: startDateStr,
        offer_type: 'discounts_table',
        discounts_table: tiers,
        options: tiers,
      };

      if (!isAll) {
        if (isCategory) {
          payload.buy = { categories: entityIds };
          payload.categories = entityIds;
        } else {
          payload.buy = { products: entityIds };
          payload.products = entityIds;
        }
      }

      if (expiryDateStr) {
        payload.expiry_date = expiryDateStr;
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