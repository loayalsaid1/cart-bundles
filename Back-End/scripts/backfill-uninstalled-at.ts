import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { eventLogs } from '../src/database/entities/event-logs';
import { merchants } from '../src/database/entities/merchants';

interface SallaUninstallEventData {
  data?: {
    uninstallation_date?: string;
  };
}

async function bootstrap() {
  console.log('Starting Backfill Uninstalled At script...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing from environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  let failed = false;
  try {
    const uninstallEvents = await db
      .select({
        merchantId: eventLogs.merchantId,
        eventDate: eventLogs.eventDate,
        eventData: eventLogs.eventData,
      })
      .from(eventLogs)
      .innerJoin(merchants, eq(eventLogs.merchantId, merchants.merchantId))
      .where(
        and(
          eq(eventLogs.eventName, 'app.uninstalled'),
          eq(merchants.isActive, false),
          isNull(merchants.uninstalledAt),
        ),
      )
      .orderBy(sql`${eventLogs.eventDate} DESC`);

    console.log(`Found ${uninstallEvents.length} uninstall events for uninstalled merchants with null uninstalledAt.`);

    const processedMerchants = new Set<number>();
    let updatedCount = 0;

    for (const event of uninstallEvents) {
      if (!event.merchantId || processedMerchants.has(event.merchantId)) continue;
      processedMerchants.add(event.merchantId);

      let uninstalledAt: Date = event.eventDate;
      const eventData = event.eventData as SallaUninstallEventData | null;
      if (eventData?.data?.uninstallation_date) {
        const parsed = new Date(eventData.data.uninstallation_date);
        if (!isNaN(parsed.getTime())) {
          uninstalledAt = parsed;
        }
      }

      await db
        .update(merchants)
        .set({ uninstalledAt })
        .where(eq(merchants.merchantId, event.merchantId));

      updatedCount++;
      console.log(`Updated merchant #${event.merchantId} uninstalledAt -> ${uninstalledAt.toISOString()}`);
    }

    console.log(`Uninstalled At backfill complete! Updated ${updatedCount} merchants.`);
  } catch (error) {
    console.error('Backfill failed:', error);
    failed = true;
  } finally {
    await pool.end();
    process.exit(failed ? 1 : 0);
  }
}

void bootstrap();
