import { z } from 'zod';
import {
  appearanceFullSchema,
  offerAppearanceSchema,
  offerInfoSchema,
  offerKindSchema,
  offerStatusSchema,
  offerTargetSchema,
  offerTargetingSchema,
  targetTypeSchema,
} from './common-offer';

export const upgradeOfferSettingsSchema = z
  .object({
    redirectToCartAfterAdd: z.boolean().optional(),
    hideSallaPopup: z.boolean().optional(),
    baseSallaProductId: z.number().int().positive(),
    upgradeSallaProductId: z.number().int().positive(),
    couponCode: z.string().optional(),
  })
  .refine(
    (s) => s.baseSallaProductId !== s.upgradeSallaProductId,
    {
      message: 'Base and upgrade products must be different',
      path: ['upgradeSallaProductId'],
    },
  );

export const upgradeOfferDraftSchema = z.object({
  info: offerInfoSchema,
  targeting: offerTargetingSchema,
  settings: upgradeOfferSettingsSchema,
  appearance: offerAppearanceSchema,
});

const upgradeSettingsFullSchema = z.object({
  offerId: z.number(),
  baseSallaProductId: z.coerce.number(),
  upgradeSallaProductId: z.coerce.number(),
  couponCode: z.string().nullable().optional(),
  sallaCouponId: z.coerce.number().nullable().optional(),
});

export const upgradeOfferFullSchema = z.object({
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
  upgradeSettings: upgradeSettingsFullSchema.nullable(),
  appearance: appearanceFullSchema.optional(),
});

export type UpgradeOfferDraft = z.infer<typeof upgradeOfferDraftSchema>;
export type UpgradeOfferFull = z.infer<typeof upgradeOfferFullSchema>;
