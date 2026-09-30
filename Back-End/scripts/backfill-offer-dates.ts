import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { offers } from '../src/database/entities/offers';
import { merchants } from '../src/database/entities/merchants';
import {
  parseRiyadhEndOfDay,
  toRiyadhCalendarDate,
} from '../src/common/time/riyadh-date';

const SALLA_SPECIAL_OFFERS_URL = 'https://api.salla.dev/admin/v2/specialoffers';

function parseSallaStart(raw: unknown): Date | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const trimmed = raw.trim();
  const asIso = trimmed.includes('T')
    ? trimmed
    : trimmed.replace(' ', 'T') + '+03:00';
  const parsed = new Date(asIso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function bootstrap() {
  console.log('Starting Backfill Offer Dates script...');

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is missing from environment.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);
  let failed = false;

  try {
    const rows = await db
      .select({
        id: offers.id,
        merchantId: offers.merchantId,
        expiryDate: offers.expiryDate,
        startDate: offers.startDate,
        sallaOfferId: offers.sallaOfferId,
        createdAt: offers.createdAt,
      })
      .from(offers);

    let expiryUpdated = 0;
    let startUpdated = 0;
    let startSkipped = 0;

    for (const row of rows) {
      if (row.expiryDate) {
        const cal = toRiyadhCalendarDate(new Date(row.expiryDate));
        const next = parseRiyadhEndOfDay(cal);
        if (next && next.getTime() !== new Date(row.expiryDate).getTime()) {
          await db
            .update(offers)
            .set({ expiryDate: next })
            .where(eq(offers.id, row.id));
          expiryUpdated++;
        }
      }

      if (row.startDate) {
        startSkipped++;
        continue;
      }

      let start: Date | null = null;
      if (row.sallaOfferId) {
        const [merchant] = await db
          .select({ accessToken: merchants.accessToken })
          .from(merchants)
          .where(eq(merchants.merchantId, row.merchantId));
        if (merchant?.accessToken) {
          try {
            const response = await fetch(
              `${SALLA_SPECIAL_OFFERS_URL}/${row.sallaOfferId}`,
              { headers: { Authorization: `Bearer ${merchant.accessToken}` } },
            );
            if (response.ok) {
              const json = (await response.json()) as {
                data?: { start_date?: string; startDate?: string };
                start_date?: string;
                startDate?: string;
              };
              start = parseSallaStart(
                json.data?.start_date ??
                  json.data?.startDate ??
                  json.start_date ??
                  json.startDate,
              );
            } else {
              console.warn(
                `Salla GET offer ${row.sallaOfferId} failed (${response.status}); using createdAt`,
              );
            }
          } catch (err) {
            console.warn(
              `Salla GET offer ${row.sallaOfferId} errored; using createdAt`,
              err,
            );
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      const fallback = new Date(row.createdAt);
      await db
        .update(offers)
        .set({ startDate: start ?? fallback })
        .where(eq(offers.id, row.id));
      startUpdated++;
    }

    console.log(
      `Offer dates backfill complete! expiryUpdated=${expiryUpdated} startUpdated=${startUpdated} startAlreadySet=${startSkipped}`,
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
