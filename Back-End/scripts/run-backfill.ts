import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  activityLogs,
  dailyStats,
} from '../src/database/entities/activity-logs';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { getDateWindow } from '../src/modules/logging/stats/date-window.util';

const STOREFRONT_ACTION_FIELD = {
  'offer.click': 'clicks',
  'offer.add_to_cart': 'addToCart',
  'offer.conversion': 'conversions',
} as const;

const BATCH_SIZE = 500;

async function bootstrap() {
  console.log('Starting standalone Daily Stats Backfill script...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing from environment.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool);

  const days = 30;
  console.log(
    `Aggregating data from activity_logs for the past ${days} days...`,
  );
  console.log(
    'Note: Impressions are NOT stored in activity_logs and will be 0 historically. They are tracked live moving forward.',
  );

  let failed = false;
  try {
    const { start } = getDateWindow(days);
    const trackedActions = Object.keys(STOREFRONT_ACTION_FIELD);

    const grouped = await db
      .select({
        merchantId: activityLogs.merchantId,
        date: sql<string>`(${activityLogs.createdAt} AT TIME ZONE 'UTC')::date::text`,
        action: activityLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.actorType, 'storefront'),
          gte(activityLogs.createdAt, new Date(`${start}T00:00:00.000Z`)),
          inArray(activityLogs.action, trackedActions),
        ),
      )
      .groupBy(
        activityLogs.merchantId,
        sql`(${activityLogs.createdAt} AT TIME ZONE 'UTC')::date`,
        activityLogs.action,
      );

    const buckets = new Map<
      string,
      { merchantId: number; date: string } & {
        impressions: number;
        clicks: number;
        addToCart: number;
        conversions: number;
      }
    >();

    for (const row of grouped) {
      if (row.merchantId == null) continue;
      const field =
        STOREFRONT_ACTION_FIELD[
          row.action as keyof typeof STOREFRONT_ACTION_FIELD
        ];
      if (!field) continue;
      const key = `${row.merchantId}:${row.date}`;
      const bucket = buckets.get(key) ?? {
        merchantId: row.merchantId,
        date: row.date,
        impressions: 0,
        clicks: 0,
        addToCart: 0,
        conversions: 0,
      };
      bucket[field] += row.count;
      buckets.set(key, bucket);
    }

    const bucketList = Array.from(buckets.values());
    if (bucketList.length === 0) {
      console.log('No historical data found to backfill.');
      await pool.end();
      return;
    }

    console.log(
      `Found ${bucketList.length} merchant-day buckets. Upserting...`,
    );

    for (let i = 0; i < bucketList.length; i += BATCH_SIZE) {
      const batch = bucketList.slice(i, i + BATCH_SIZE);
      await db
        .insert(dailyStats)
        .values(batch)
        .onConflictDoUpdate({
          target: [dailyStats.merchantId, dailyStats.date],
          set: {
            clicks: sql`greatest(${dailyStats.clicks}, EXCLUDED.clicks)`,
            addToCart: sql`greatest(${dailyStats.addToCart}, EXCLUDED.add_to_cart)`,
            conversions: sql`greatest(${dailyStats.conversions}, EXCLUDED.conversions)`,
            updatedAt: new Date(),
          },
        });
      console.log(`Processed ${i + batch.length} / ${bucketList.length}`);
    }

    console.log('Backfill complete!');
  } catch (error) {
    console.error('Backfill failed:', error);
    failed = true;
  } finally {
    await pool.end();
    process.exit(failed ? 1 : 0);
  }
}

void bootstrap();
