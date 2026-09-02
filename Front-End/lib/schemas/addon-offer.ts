import { z } from 'zod';
import {
  appearanceFullSchema,
  displayOrientationSchema,
  offerAppearanceSchema,
  offerInfoSchema,
  offerKindSchema,
  offerStatusSchema,
  offerTargetSchema,
  relatedProductDraftSchema,
  relatedProductFullSchema,
  targetTypeSchema,
} from './common-offer';

// Addon offers only support 'percentage' or 'free-product' as get.discount_type in Salla
const addonDiscountTypeSchema = z.enum(['percentage', 'free-product']);
const addonTargetTypeSchema = targetTypeSchema.exclude(["all_products"]);
// Addon targeting is restricted — all_products is NOT valid for buy_x_get_y on Salla
const addonTargetingSchema = z
  .object({
    type: addonTargetTypeSchema,
    ids: z.array(z.number()).optional(),
  })
  .refine((t) => t.ids && t.ids.length > 0, {
    message: 'Select at least one target',
    path: ['ids'],
  });

export const addonOfferSettingsSchema = z.object({
  redirectToCartAfterAdd: z.boolean().optional(),
  hideSallaPopup: z.boolean().optional(),
  maxItems: z.number().int().min(1).optional(),
  productsPreselectedByDefault: z.boolean().optional(),
  showProductOptions: z.boolean().optional(),
  displayOrientation: displayOrientationSchema.optional(),
  discountType: addonDiscountTypeSchema.optional(),
  discountAmount: z.number().positive().optional(),
  positionDesktop: z.string().optional(),
  positionMobile: z.string().optional(),
  relatedProducts: z.array(relatedProductDraftSchema).min(1),
});

export const addonOfferDraftSchema = z.object({
  info: offerInfoSchema,
  targeting: addonTargetingSchema,
  settings: addonOfferSettingsSchema,
  appearance: offerAppearanceSchema,
});

const addonSettingsFullSchema = z.object({
  offerId: z.number(),
  maxItems: z.number(),
  productsPreselectedByDefault: z.boolean(),
  showProductOptions: z.boolean(),
  displayOrientation: displayOrientationSchema,
  discountType: addonDiscountTypeSchema.nullable().optional(),
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
  targetType: addonTargetTypeSchema,
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
