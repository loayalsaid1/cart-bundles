import { z } from 'zod';

export const offerKindSchema = z.enum([
  'quantity_discount',
  'product_add_on',
  'bundle',
  'upgrade_offer',
  'cart_recommendation',
]);

export const offerStatusSchema = z.enum(['draft', 'active', 'paused', 'expired']);

export const targetTypeSchema = z.enum([
  'all_products',
  'selected_products',
  'selected_categories',
]);

export const pricingTypeSchema = z.enum(['percentage', 'fixed']);

export const localeTextSchema = z.object({
  ar: z.string().min(1),
  en: z.string().optional(),
});

const emptyToUndefined = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const offerInfoSchema = z.object({
  internalName: z.string().min(1),
  title: localeTextSchema,
  subtitle: z
    .object({
      ar: z.string().optional(),
      en: z.string().optional(),
    })
    .optional(),
  expiryDate: z.string().optional(),
  startNow: z.boolean().optional().default(true),
  startDate: z.string().optional(),
  startFrozen: z.boolean().optional(),
});

export const offerTargetingSchema = z
  .object({
    type: targetTypeSchema,
    ids: z.array(z.number()).optional(),
  })
  .refine((t) => t.type === 'all_products' || (t.ids && t.ids.length > 0), {
    message: 'Select at least one target',
    path: ['ids'],
  });

export const titleAlignSchema = z.enum(['start', 'center', 'end']);
export const appearanceShadowSchema = z.enum(['none', 'sm', 'md', 'lg']);
export const appearancePresetKindSchema = z.enum(['colors', 'full']);

export const offerAppearanceSchema = z
  .object({
    borderRadiusPx: z.number().optional(),
    colors: z.record(z.string(), z.string()).optional(),
    titleAlign: titleAlignSchema.optional(),
    showBorder: z.boolean().optional(),
    shadow: appearanceShadowSchema.optional(),
  })
  .optional();

export const dashboardOfferSchema = z.object({
  id: z.number(),
  internalName: z.string(),
  kind: offerKindSchema,
  status: offerStatusSchema,
  expiryDate: z.string().nullable().optional(),
  targetsCount: z.coerce.number(),
  impressions: z.coerce.number().optional().default(0),
  clicks: z.coerce.number().optional().default(0),
  addToCart: z.coerce.number().optional().default(0),
  conversions: z.coerce.number().optional().default(0),
});

export const relatedProductDraftSchema = z.object({
  sallaProductId: z.number(),
  position: z.number().optional(),
  isPreselected: z.boolean().optional(),
});

export const offerTargetSchema = z.object({
  id: z.number(),
  offerId: z.number(),
  entityType: z.enum(["product", "category"]),
  sallaEntityId: z.coerce.number(),
});

export const relatedProductFullSchema = z.object({
  id: z.number(),
  offerId: z.number(),
  sallaProductId: z.coerce.number(),
  position: z.number(),
  isPreselected: z.boolean(),
});

export const appearanceFullSchema = z
  .object({
    offerId: z.number(),
    borderRadiusPx: z.number(),
    colors: z.record(z.string(), z.string()),
    titleAlign: titleAlignSchema.optional().default('start'),
    showBorder: z.boolean().optional().default(true),
    shadow: appearanceShadowSchema.optional().default('sm'),
  })
  .nullable();

export const appearancePresetSchema = z.object({
  id: z.number(),
  merchantId: z.number(),
  name: z.string(),
  kind: appearancePresetKindSchema,
  colors: z.record(z.string(), z.string()),
  borderRadiusPx: z.number().nullable().optional(),
  titleAlign: titleAlignSchema.nullable().optional(),
  showBorder: z.boolean().nullable().optional(),
  shadow: appearanceShadowSchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const displayOrientationSchema = z.enum(["vertical", "horizontal"]);

export type OfferKind = z.infer<typeof offerKindSchema>;
export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type TargetType = z.infer<typeof targetTypeSchema>;
export type OfferInfo = z.infer<typeof offerInfoSchema>;
export type OfferTargeting = z.infer<typeof offerTargetingSchema>;
export type OfferAppearance = z.infer<typeof offerAppearanceSchema>;
export type TitleAlign = z.infer<typeof titleAlignSchema>;
export type AppearanceShadow = z.infer<typeof appearanceShadowSchema>;
export type AppearancePresetKind = z.infer<typeof appearancePresetKindSchema>;
export type AppearancePreset = z.infer<typeof appearancePresetSchema>;
export type DashboardOffer = z.infer<typeof dashboardOfferSchema>;
export type RelatedProductDraft = z.infer<typeof relatedProductDraftSchema>;
export type OfferTarget = z.infer<typeof offerTargetSchema>;
export type RelatedProductFull = z.infer<typeof relatedProductFullSchema>;
export type OfferAppearanceFull = z.infer<typeof appearanceFullSchema>;
export type DisplayOrientation = z.infer<typeof displayOrientationSchema>;
