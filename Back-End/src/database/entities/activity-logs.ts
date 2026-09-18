import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  bigserial,
} from 'drizzle-orm/pg-core';
import { merchants } from './merchants';
import { offers } from './offers';

export const activityActorTypeEnum = pgEnum('activity_actor_type', [
  'merchant',
  'admin',
  'system',
  'storefront',
  'salla',
]);

export const activitySeverityEnum = pgEnum('activity_severity', [
  'info',
  'warn',
  'error',
]);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    merchantId: integer('merchant_id').references(() => merchants.merchantId, {
      onDelete: 'cascade',
    }),
    actorType: activityActorTypeEnum('actor_type').notNull(),
    actorId: varchar('actor_id', { length: 64 }),
    action: varchar('action', { length: 100 }).notNull(),
    entityType: varchar('entity_type', { length: 64 }),
    entityId: varchar('entity_id', { length: 64 }),
    offerId: integer('offer_id').references(() => offers.id, {
      onDelete: 'set null',
    }),
    severity: activitySeverityEnum('severity').notNull().default('info'),
    message: text('message'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('activity_logs_merchant_created_idx').on(
      table.merchantId,
      table.createdAt,
    ),
    index('activity_logs_action_idx').on(table.action),
    index('activity_logs_offer_idx').on(table.offerId),
  ],
);

export const offerStats = pgTable('offer_stats', {
  offerId: integer('offer_id')
    .primaryKey()
    .references(() => offers.id, { onDelete: 'cascade' }),
  merchantId: integer('merchant_id')
    .notNull()
    .references(() => merchants.merchantId, { onDelete: 'cascade' }),
  impressions: bigint('impressions', { mode: 'number' }).notNull().default(0),
  clicks: bigint('clicks', { mode: 'number' }).notNull().default(0),
  addToCart: bigint('add_to_cart', { mode: 'number' }).notNull().default(0),
  conversions: bigint('conversions', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const dailyStats = pgTable(
  'daily_stats',
  {
    merchantId: integer('merchant_id')
      .notNull()
      .references(() => merchants.merchantId, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    impressions: bigint('impressions', { mode: 'number' }).notNull().default(0),
    clicks: bigint('clicks', { mode: 'number' }).notNull().default(0),
    addToCart: bigint('add_to_cart', { mode: 'number' }).notNull().default(0),
    conversions: bigint('conversions', { mode: 'number' }).notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({
      name: 'daily_stats_pk',
      columns: [table.merchantId, table.date],
    }),
  ],
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type OfferStat = typeof offerStats.$inferSelect;
export type DailyStat = typeof dailyStats.$inferSelect;
