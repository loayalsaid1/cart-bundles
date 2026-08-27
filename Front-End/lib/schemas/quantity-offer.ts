import { z } from 'zod';
import {
  localeTextSchema,
  offerAppearanceSchema,
  offerInfoSchema,
  offerKindSchema,
  offerStatusSchema,
  offerTargetingSchema,
  pricingTypeSchema,
  targetTypeSchema,
} from './common-offer';

export const quantityTierDraftSchema = z
  .object({
    quantity: z.number().int().min(2),
    mainTitle: localeTextSchema,
    subtitle: z
      .object({
        ar: z.string().optional(),
        en: z.string().optional(),
      })
      .optional(),
    pricingType: pricingTypeSchema,
    discountAmount: z.number().positive(),
    isSelectedByDefault: z.boolean().optional(),
    badgeText: z.string().optional(),
    labelText: z.string().optional(),
  })
  .superRefine((tier, ctx) => {
    if (tier.pricingType === 'percentage' && (tier.discountAmount < 1 || tier.discountAmount > 100)) {
      ctx.addIssue({
        code: 'custom',
        path: ['discountAmount'],
        message: 'Percentage discount must be between 1 and 100',
      });
    }
  });

export const quantityOfferSettingsSchema = z.object({
  redirectToCartAfterAdd: z.boolean().optional(),
  hideSallaPopup: z.boolean().optional(),
  allowDifferentOptionsPerPiece: z.boolean().optional(),
  hideThemeDefaultOptions: z.boolean().optional(),
  showPricePerPiece: z.boolean().optional(),
  roundPriceToNearestInteger: z.boolean().optional(),
  applyEvenWithCoupon: z.boolean().optional(),
  hideQuantityField: z.boolean().optional(),
  tiers: z.array(quantityTierDraftSchema).min(1),
});

export const quantityOfferDraftSchema = z.object({
  info: offerInfoSchema,
  targeting: offerTargetingSchema,
  settings: quantityOfferSettingsSchema,
  appearance: offerAppearanceSchema,
});

const offerTargetSchema = z.object({
  id: z.number(),
  offerId: z.number(),
  entityType: z.enum(['product', 'category']),
  sallaEntityId: z.coerce.number(),
});

const quantityTierFullSchema = z.object({
  id: z.number(),
  offerId: z.number(),
  position: z.number(),
  quantity: z.number(),
  mainTitle: z.record(z.string(), z.string()),
  subtitle: z.record(z.string(), z.string()).nullable().optional(),
  pricingType: pricingTypeSchema,
  discountAmount: z.coerce.number(),
  isSelectedByDefault: z.boolean(),
  badgeText: z.string().nullable().optional(),
  labelText: z.string().nullable().optional(),
});

export const quantityOfferFullSchema = z.object({
  id: z.number(),
  merchantId: z.number(),
  kind: offerKindSchema,
  internalName: z.string(),
  title: z.record(z.string(), z.string()),
  subtitle: z.record(z.string(), z.string()).nullable().optional(),
  targetType: targetTypeSchema,
  expiryDate: z.string().nullable().optional(),
  status: offerStatusSchema,
  redirectToCartAfterAdd: z.boolean(),
  hideSallaPopup: z.boolean(),
  sallaOfferId: z.coerce.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  targets: z.array(offerTargetSchema),
  quantitySettings: z
    .object({
      offerId: z.number(),
      allowDifferentOptionsPerPiece: z.boolean(),
      hideThemeDefaultOptions: z.boolean(),
      showPricePerPiece: z.boolean(),
      roundPriceToNearestInteger: z.boolean(),
      applyEvenWithCoupon: z.boolean(),
      hideQuantityField: z.boolean(),
    })
    .nullable(),
  quantityTiers: z.array(quantityTierFullSchema),
  appearance: z
    .object({
      offerId: z.number(),
      borderRadiusPx: z.number(),
      colors: z.record(z.string(), z.string()),
    })
    .nullable(),
});

export type QuantityOfferDraft = z.infer<typeof quantityOfferDraftSchema>;
export type QuantityOfferFull = z.infer<typeof quantityOfferFullSchema>;
export type QuantityTierDraft = z.infer<typeof quantityTierDraftSchema>;
