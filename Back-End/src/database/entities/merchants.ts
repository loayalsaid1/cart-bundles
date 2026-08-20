import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const merchants = pgTable('merchants', {
  id: serial('id').primaryKey(),
  merchantId: integer('merchant_id').notNull().unique(),
  accessToken: varchar('access_token', { length: 255 }).notNull(),
  refreshToken: varchar('refresh_token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Merchant = typeof merchants.$inferSelect;
export type NewMerchant = typeof merchants.$inferInsert;
