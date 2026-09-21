import { z } from 'zod';

export const adminOverviewSchema = z.object({
  merchants: z.object({
    total: z.number(),
    active: z.number(),
    inactive: z.number(),
    zeroOffersCount: z.number().optional().default(0),
  }),
  offers: z.object({
    total: z.number(),
    active: z.number(),
    kindBreakdown: z.record(z.string(), z.number()).optional().default({}),
  }),
  revenueAttributed: z.coerce.string().optional().default('0'),
  conversions: z.number().optional().default(0),
  queueHealth: z
    .object({
      webhooksFailed: z.number(),
      activityFailed: z.number(),
      storefrontFailed: z.number(),
    })
    .optional()
    .default({ webhooksFailed: 0, activityFailed: 0, storefrontFailed: 0 }),
  topMerchants: z
    .array(
      z.object({
        merchantId: z.number(),
        storeName: z.string().nullable(),
        conversions: z.number(),
        revenueAttributed: z.coerce.string(),
      }),
    )
    .optional()
    .default([]),
  systemHealth: z
    .object({
      status: z.enum(['healthy', 'degraded']),
      errorCount24h: z.number(),
    })
    .optional()
    .default({ status: 'healthy', errorCount24h: 0 }),
  dailyPerformance: z
    .array(
      z.object({
        date: z.string(),
        impressions: z.number(),
        conversions: z.number(),
      }),
    )
    .optional()
    .default([]),
  recentErrors: z.array(
    z.object({
      id: z.number(),
      merchantId: z.number().nullable(),
      action: z.string(),
      message: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});

export const adminLoginSchema = z.object({
  success: z.boolean(),
});

export const adminMerchantSchema = z.object({
  merchantId: z.coerce.number(),
  storeName: z.string().nullable().optional(),
  storeEmail: z.string().nullable().optional(),
  storeDomain: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  uninstalledAt: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  offerCounts: z.object({
    total: z.coerce.number(),
    active: z.coerce.number(),
  }),
});

export const adminMerchantDetailSchema = adminMerchantSchema.extend({
  tokenStatus: z.enum(['valid', 'expiring', 'expired', 'missing']),
  lastWebhookAt: z.string().nullable(),
  stats: z.object({
    impressions: z.number(),
    clicks: z.number(),
    addToCart: z.number(),
    conversions: z.number(),
    conversionsAttributed: z.number(),
    revenueGenerated: z.number(),
    revenueAttributed: z.number(),
  }),
});

export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminMerchant = z.infer<typeof adminMerchantSchema>;
export type AdminMerchantDetail = z.infer<typeof adminMerchantDetailSchema>;
