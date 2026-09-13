import { z } from 'zod';

export const activitySeveritySchema = z.enum(['info', 'warn', 'error']);

export const activityLogSchema = z.object({
  id: z.number(),
  merchantId: z.number().nullable(),
  actorType: z.enum(['merchant', 'admin', 'system', 'storefront', 'salla']),
  actorId: z.string().nullable().optional(),
  action: z.string(),
  entityType: z.string().nullable().optional(),
  entityId: z.string().nullable().optional(),
  offerId: z.number().nullable().optional(),
  severity: activitySeveritySchema,
  message: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export const merchantHealthSchema = z.object({
  merchantId: z.number(),
  isActive: z.boolean(),
  tokenStatus: z.enum(['valid', 'expiring', 'expired', 'missing']),
  tokenExpiresAt: z.string().nullable(),
  lastWebhookAt: z.string().nullable(),
  lastWebhookEvent: z.string().nullable(),
  lastActivityAt: z.string().nullable(),
  offerCounts: z.object({
    total: z.number(),
    active: z.number(),
    paused: z.number(),
    draft: z.number(),
    expired: z.number(),
  }),
  stats: z.object({
    impressions: z.number(),
    clicks: z.number(),
    addToCart: z.number(),
    conversions: z.number(),
  }),
  redisConnected: z.boolean(),
});

export type ActivityLog = z.infer<typeof activityLogSchema>;
export type MerchantHealth = z.infer<typeof merchantHealthSchema>;
