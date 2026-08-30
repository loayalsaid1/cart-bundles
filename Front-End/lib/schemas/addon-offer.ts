import { z } from 'zod';
import {
  appearanceFullSchema,
  displayOrientationSchema,
  offerAppearanceSchema,
  offerInfoSchema,
  offerKindSchema,
  offerStatusSchema,
  offerTargetSchema,
  offerTargetingSchema,
  pricingTypeSchema,
  relatedProductDraftSchema,
  relatedProductFullSchema,
  targetTypeSchema,
} from './common-offer';

export const addonOfferSettingsSchema = z.object({
  redirectToCartAfterAdd: z.boolean().optional(),
  hideSallaPopup: z.boolean().optional(),
  maxItems: z.number().int().min(1).optional(),
  productsPreselectedByDefault: z.boolean().optional(),
  showProductOptions: z.boolean().optional(),
  displayOrientation: displayOrientationSchema.optional(),
  discountType: pricingTypeSchema.optional(),
  discountAmount: z.number().positive().optional(),
  positionDesktop: z.string().optional(),
  positionMobile: z.string().optional(),
  relatedProducts: z.array(relatedProductDraftSchema).min(1),
});

export const addonOfferDraftSchema = z.object({
  info: offerInfoSchema,
  targeting: offerTargetingSchema,
  settings: addonOfferSettingsSchema,
  appearance: offerAppearanceSchema,
});

const addonSettingsFullSchema = z.object({
  offerId: z.number(),
  maxItems: z.number(),
  productsPreselectedByDefault: z.boolean(),
  showProductOptions: z.boolean(),
  displayOrientation: displayOrientationSchema,
  discountType: pricingTypeSchema.nullable().optional(),
  discountAmount: z.coerce.number().nullable().optional(),
  positionDesktop: z.string().nullable().optional(),
  positionMobile: z.string().nullable().optional(),
});

export const addonOfferFullSchema = z.object({
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
  relatedProducts: z.array(relatedProductFullSchema),
  addonSettings: addonSettingsFullSchema.nullable(),
  appearance: appearanceFullSchema,
});

export type AddonOfferDraft = z.infer<typeof addonOfferDraftSchema>;
export type AddonOfferFull = z.infer<typeof addonOfferFullSchema>;
