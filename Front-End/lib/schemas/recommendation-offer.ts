import { z } from 'zod';
import {
  appearanceFullSchema,
  offerAppearanceSchema,
  offerInfoSchema,
  offerKindSchema,
  offerStatusSchema,
  relatedProductDraftSchema,
  relatedProductFullSchema,
  targetTypeSchema,
} from './common-offer';

export const recommendationModeSchema = z.enum(['cart_related', 'general']);

export const recommendationOfferSettingsSchema = z
  .object({
    mode: recommendationModeSchema,
    triggerSallaProductId: z.number().int().positive().optional(),
    relatedProducts: z.array(relatedProductDraftSchema).min(1),
  })
  .refine(
    (s) =>
      s.mode === 'general' ||
      (s.triggerSallaProductId !== undefined && s.triggerSallaProductId > 0),
    {
      message: 'Select a trigger product',
      path: ['triggerSallaProductId'],
    },
  );

export const recommendationOfferDraftSchema = z.object({
  info: offerInfoSchema,
  settings: recommendationOfferSettingsSchema,
  appearance: offerAppearanceSchema,
});

const recommendationSettingsFullSchema = z.object({
  offerId: z.number(),
  mode: recommendationModeSchema,
  triggerSallaProductId: z.coerce.number().nullable().optional(),
});

export const recommendationOfferFullSchema = z.object({
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
  relatedProducts: z.array(relatedProductFullSchema),
  recommendationSettings: recommendationSettingsFullSchema.nullable(),
  appearance: appearanceFullSchema.optional(),
});

export type RecommendationOfferDraft = z.infer<
  typeof recommendationOfferDraftSchema
>;
export type RecommendationOfferFull = z.infer<
  typeof recommendationOfferFullSchema
>;
