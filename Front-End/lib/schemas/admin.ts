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
  webhooksLast24h: z.number(),
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
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  offerCounts: z.object({
    total: z.coerce.number(),
    active: z.coerce.number(),
  }),
});

export type AdminOverview = z.infer<typeof adminOverviewSchema>;
export type AdminMerchant = z.infer<typeof adminMerchantSchema>;
