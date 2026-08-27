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

export const offerAppearanceSchema = z
  .object({
    borderRadiusPx: z.number().optional(),
    colors: z.record(z.string(), z.string()).optional(),
  })
  .optional();

export const dashboardOfferSchema = z.object({
  id: z.number(),
  internalName: z.string(),
  kind: offerKindSchema,
  status: offerStatusSchema,
  expiryDate: z.string().nullable().optional(),
  targetsCount: z.coerce.number(),
});

export type OfferKind = z.infer<typeof offerKindSchema>;
export type OfferStatus = z.infer<typeof offerStatusSchema>;
export type TargetType = z.infer<typeof targetTypeSchema>;
export type OfferInfo = z.infer<typeof offerInfoSchema>;
export type OfferTargeting = z.infer<typeof offerTargetingSchema>;
export type OfferAppearance = z.infer<typeof offerAppearanceSchema>;
export type DashboardOffer = z.infer<typeof dashboardOfferSchema>;
