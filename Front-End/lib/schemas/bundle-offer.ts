import { z } from 'zod';
import {
  appearanceFullSchema,
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

export const bundleOfferSettingsSchema = z.object({
  redirectToCartAfterAdd: z.boolean().optional(),
  hideSallaPopup: z.boolean().optional(),
  discountType: pricingTypeSchema.optional(),
  discountAmount: z.number().positive().optional(),
  relatedProducts: z.array(relatedProductDraftSchema).min(1),
});

export const bundleOfferDraftSchema = z.object({
  info: offerInfoSchema,
  targeting: offerTargetingSchema,
  settings: bundleOfferSettingsSchema,
  appearance: offerAppearanceSchema,
});

const bundleSettingsFullSchema = z.object({
  offerId: z.number(),
  discountType: pricingTypeSchema.nullable().optional(),
  discountAmount: z.coerce.number().nullable().optional(),
});

export const bundleOfferFullSchema = z.object({
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
  bundleSettings: bundleSettingsFullSchema.nullable(),
  appearance: appearanceFullSchema,
});

export type BundleOfferDraft = z.infer<typeof bundleOfferDraftSchema>;
export type BundleOfferFull = z.infer<typeof bundleOfferFullSchema>;
