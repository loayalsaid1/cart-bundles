import { z } from 'zod';

export const activitySeveritySchema = z.enum(['info', 'warn', 'error']);

export const activityLogSchema = z.object({
  id: z.coerce.number(),
  merchantId: z.coerce.number().nullable(),
  actorType: z.enum(['merchant', 'admin', 'system', 'storefront', 'salla']),
  actorId: z.string().nullable().optional(),
  action: z.string(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  offerId: z.coerce.number().nullable().optional(),
  severity: activitySeveritySchema,
  message: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
}).passthrough();

export const activityListResponseSchema = z.object({
  items: z.array(activityLogSchema),
  hasMore: z.boolean(),
});

export const merchantHealthSchema = z.object({
  merchantId: z.coerce.number(),
  isActive: z.boolean(),
  tokenStatus: z.enum(['valid', 'expiring', 'expired', 'missing']),
  tokenExpiresAt: z.string().nullable().optional(),
  lastWebhookAt: z.string().nullable().optional(),
  lastWebhookEvent: z.string().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
  offerCounts: z.object({
    total: z.coerce.number(),
    active: z.coerce.number(),
    paused: z.coerce.number(),
    draft: z.coerce.number(),
    expired: z.coerce.number(),
  }),
  stats: z.object({
    impressions: z.coerce.number(),
    clicks: z.coerce.number(),
    addToCart: z.coerce.number(),
    conversions: z.coerce.number(),
  }),
  redisConnected: z.boolean().optional(),
}).passthrough();

export const dailyStatPointSchema = z.object({
  date: z.string(),
  impressions: z.coerce.number(),
  clicks: z.coerce.number(),
  addToCart: z.coerce.number(),
  conversions: z.coerce.number(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>;
export type MerchantHealth = z.infer<typeof merchantHealthSchema>;
export type DailyStatPoint = z.infer<typeof dailyStatPointSchema>;
