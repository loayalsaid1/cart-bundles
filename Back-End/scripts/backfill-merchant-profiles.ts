import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { merchants } from '../src/database/entities/merchants';
import { mapStoreInfo } from '../src/modules/merchants/merchant-profile.mapper';
import type { SallaStoreInfoResponse } from '../src/modules/merchants/types/salla-store-info.types';

async function bootstrap() {
  console.log('Starting Backfill Merchant Profiles script...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing from environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  let failed = false;
  try {
    const activeMerchants = await db
      .select({
        merchantId: merchants.merchantId,
        accessToken: merchants.accessToken,
        storeName: merchants.storeName,
      })
      .from(merchants)
      .where(eq(merchants.isActive, true));

    console.log(`Found ${activeMerchants.length} active merchants to process.`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const merchant of activeMerchants) {
      if (!merchant.accessToken) {
        console.log(`Skipping merchant #${merchant.merchantId}: missing access token.`);
        skippedCount++;
        continue;
      }

      try {
        const response = await fetch('https://api.salla.dev/admin/v2/store/info', {
          headers: { Authorization: `Bearer ${merchant.accessToken}` },
          redirect: 'follow',
        });

        if (!response.ok) {
          console.warn(
            `Failed to fetch store info for merchant #${merchant.merchantId} (status ${response.status})`,
          );
          skippedCount++;
          continue;
        }

        const json = (await response.json()) as SallaStoreInfoResponse;
        const profile = mapStoreInfo(json);

        await db
          .update(merchants)
          .set({
            storeName: profile.storeName,
            storeEmail: profile.storeEmail,
            storeDomain: profile.storeDomain,
            avatar: profile.avatar,
          })
          .where(eq(merchants.merchantId, merchant.merchantId));

        updatedCount++;
        console.log(
          `Updated merchant #${merchant.merchantId}: ${profile.storeName ?? 'Unnamed'} (${profile.storeEmail ?? 'No email'})`,
        );
      } catch (err) {
        console.error(`Error processing merchant #${merchant.merchantId}:`, err);
        skippedCount++;
      }

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(
      `Merchant profiles backfill complete! Updated: ${updatedCount}, Skipped: ${skippedCount}`,
    );
  } catch (error) {
    console.error('Backfill failed:', error);
    failed = true;
  } finally {
    await pool.end();
    process.exit(failed ? 1 : 0);
  }
}

void bootstrap();
