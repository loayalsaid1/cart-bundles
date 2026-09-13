import { z } from 'zod';

export const adminOverviewSchema = z.object({
  merchants: z.object({
    total: z.number(),
    active: z.number(),
    inactive: z.number(),
  }),
  offers: z.object({
    total: z.number(),
    active: z.number(),
  }),
  webhooksLast24h: z.number(),
  redisConnected: z.boolean(),
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

export type AdminOverview = z.infer<typeof adminOverviewSchema>;
